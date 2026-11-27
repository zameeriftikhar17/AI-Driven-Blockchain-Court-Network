import json
import hashlib
import urllib.request
import urllib.error
from urllib.parse import quote
from fastapi import HTTPException, UploadFile, File, Form
from pathlib import Path
from io import BytesIO
from pypdf import PdfReader
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import xgboost as xgb
from catboost import CatBoostClassifier, CatBoostRegressor, Pool
import joblib


# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ============================================================
# CASE DOCUMENT STORAGE
# ============================================================

DOCUMENTS_DIR = os.path.join(BASE_DIR, "case_documents")

os.makedirs(DOCUMENTS_DIR, exist_ok=True)

# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(title="Court Network AI API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODEL PATHS
# ============================================================

PRIORITY_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "priority_model.json"
)

CASE_CLASSIFICATION_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "case_type_catboost_model.cbm"
)

DURATION_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "court_duration_catboost_model (1).cbm"
)

JUDGE_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "final_judge_recommendation_model.pkl"
)

JUDGE_FEATURES_PATH = os.path.join(
    MODELS_DIR,
    "judge_model_features.pkl"
)


# ============================================================
# LOAD AI MODELS
# ============================================================

print("\n" + "=" * 60)
print("LOADING COURT NETWORK AI MODELS")
print("=" * 60)


# ------------------------------------------------------------
# 1. XGBoost - Priority Prediction
# ------------------------------------------------------------

try:
    priority_model = xgb.XGBClassifier()
    priority_model.load_model(PRIORITY_MODEL_PATH)

    print("Priority model loaded successfully.")

except Exception as e:
    priority_model = None
    print("ERROR loading priority model:")
    print(e)


# ------------------------------------------------------------
# 2. CatBoost - Case Classification
# ------------------------------------------------------------

try:
    case_classification_model = CatBoostClassifier()

    case_classification_model.load_model(
        CASE_CLASSIFICATION_MODEL_PATH
    )

    print("Case classification model loaded successfully.")

except Exception as e:
    case_classification_model = None
    print("ERROR loading case classification model:")
    print(e)


# ------------------------------------------------------------
# 3. CatBoost - Case Duration Prediction
# ------------------------------------------------------------

try:
    duration_model = CatBoostRegressor()

    duration_model.load_model(
        DURATION_MODEL_PATH
    )

    print("Case duration model loaded successfully.")

except Exception as e:
    duration_model = None
    print("ERROR loading duration model:")
    print(e)


# ------------------------------------------------------------
# 4. CatBoost - Judge Recommendation
# ------------------------------------------------------------

try:
    judge_model = joblib.load(
        JUDGE_MODEL_PATH
    )

    print("Judge recommendation model loaded successfully.")

except Exception as e:
    judge_model = None
    print("ERROR loading judge recommendation model:")
    print(e)


# ------------------------------------------------------------
# 5. Judge Model Features
# ------------------------------------------------------------

try:
    judge_features = joblib.load(
        JUDGE_FEATURES_PATH
    )

    print("Judge model features loaded successfully.")
    print("Judge features:", judge_features)

except Exception as e:

    judge_features = [
        "complexity_score",
        "estimated_duration_days",
        "number_of_parties",
        "case_age",
        "appeal_level"
    ]

    print("Could not load judge feature file.")
    print("Using default features:", judge_features)


print("=" * 60)


# ============================================================
# EXTRACT TEXT FROM CASE DOCUMENTS
# ============================================================

@app.post("/extract-case-documents")
async def extract_case_documents(
    files: list[UploadFile] = File(...)
):
    extracted_documents = []

    for file in files:
        if not file.filename:
            continue

        content = await file.read()
        filename = os.path.basename(file.filename)

        if filename.lower().endswith(".pdf"):
            try:
                reader = PdfReader(BytesIO(content))

                pages_text = []
                for page in reader.pages:
                    pages_text.append(page.extract_text() or "")

                extracted_text = "\n".join(pages_text)

                words = extracted_text.split()
                sentences = [
                    s for s in extracted_text.replace("!", ".").replace("?", ".").split(".")
                    if s.strip()
                ]

                extracted_documents.append({
                    "name": filename,
                    "page_count": len(reader.pages),
                    "word_count": len(words),
                    "character_count": len(extracted_text),
                    "sentence_count": len(sentences),
                    "text": extracted_text
                })

            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not read PDF {filename}: {str(e)}"
                )

        else:
            extracted_documents.append({
                "name": filename,
                "page_count": 0,
                "word_count": 0,
                "character_count": 0,
                "sentence_count": 0,
                "text": "",
                "message": "Currently only PDF text extraction is supported."
            })

    return {
        "success": True,
        "documents": extracted_documents
    }
# ============================================================
# CASE DOCUMENT UPLOAD
# ============================================================

@app.post("/upload-case-documents")
async def upload_case_documents(
    caseId: str = Form(...),
    files: list[UploadFile] = File(...)
):

    case_folder = os.path.join(DOCUMENTS_DIR, caseId)

    os.makedirs(case_folder, exist_ok=True)

    uploaded_documents = []

    for file in files:

        if not file.filename:
            continue

        safe_filename = os.path.basename(file.filename)

        file_path = os.path.join(
            case_folder,
            safe_filename
        )

        content = await file.read()
        document_hash = hashlib.sha256(content).hexdigest()

        with open(file_path, "wb") as document:
            document.write(content)

        uploaded_documents.append({
            "documentHash": document_hash,
            "name": safe_filename,
            "fileName": safe_filename,
            "url": f"/case-documents/{quote(caseId)}/{quote(safe_filename)}",
            "type": file.content_type,
            "size": len(content)
        })

    return {
        "success": True,
        "documents": uploaded_documents
    }

    # ============================================================
# OPEN CASE DOCUMENT
# ============================================================

from fastapi.responses import FileResponse


@app.get("/case-documents/{case_id}/{filename}")
def open_case_document(case_id: str, filename: str):

    safe_case_id = os.path.basename(case_id)
    safe_filename = os.path.basename(filename)

    file_path = os.path.join(
        DOCUMENTS_DIR,
        safe_case_id,
        safe_filename
    )

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    return FileResponse(
        file_path,
        filename=safe_filename
    )
# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Court Network AI API is running",

        "models": {
            "priority": (
                "loaded"
                if priority_model is not None
                else "not loaded"
            ),

            "case_classification": (
                "loaded"
                if case_classification_model is not None
                else "not loaded"
            ),

            "duration": (
                "loaded"
                if duration_model is not None
                else "not loaded"
            ),

            "judge_recommendation": (
                "loaded"
                if judge_model is not None
                else "not loaded"
            )
        }
    }


# ============================================================
# 1. PRIORITY PREDICTION
# ============================================================

class PriorityRequest(BaseModel):

    complexity_score: float
    case_age: float
    estimated_duration_days: float
    hearing_count: float
    adjournment_count: float
    pending_references: float
    judgment_complexity: float
    workload_score: float
    total_citations: float
    cases_cited_count: float
    statutes_cited_count: float
    foreign_citations: float
    number_of_parties: float
    page_count: float
    word_count: float
    sentence_count: float
    is_appeal: float

    case_type_civil: float
    case_type_constitutional: float
    case_type_corporate: float
    case_type_criminal: float
    case_type_election: float
    case_type_family: float
    case_type_service: float
    case_type_tax: float
    case_type_uncategorized: float


@app.post("/predict-priority")
def predict_priority(data: PriorityRequest):

    if priority_model is None:
        return {
            "success": False,
            "error": "Priority model is not loaded."
        }

    try:

        input_data = [[

            data.complexity_score,
            data.case_age,
            data.estimated_duration_days,
            data.hearing_count,
            data.adjournment_count,
            data.pending_references,
            data.judgment_complexity,
            data.workload_score,
            data.total_citations,
            data.cases_cited_count,
            data.statutes_cited_count,
            data.foreign_citations,
            data.number_of_parties,
            data.page_count,
            data.word_count,
            data.sentence_count,
            data.is_appeal,

            data.case_type_civil,
            data.case_type_constitutional,
            data.case_type_corporate,
            data.case_type_criminal,
            data.case_type_election,
            data.case_type_family,
            data.case_type_service,
            data.case_type_tax,
            data.case_type_uncategorized
        ]]

        prediction = priority_model.predict(
            input_data
        )[0]

        return {
            "success": True,
            "predicted_priority": int(prediction)
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }


# ============================================================
# 2. CASE CLASSIFICATION
# ============================================================

class CaseClassificationRequest(BaseModel):

    year: float
    page_count: float
    word_count: float
    character_count: float
    sentence_count: float
    paragraph_count: float
    avg_word_per_page: float

    case_subtype: str

    classification_confidence: float
    estimated_duration_days: float
    complexity_score: float
    case_age: float

    charges: str

    number_of_parties: float
    total_citations: float
    cases_cited_count: float
    statutes_cited_count: float
    foreign_citations: float

    is_appeal: float
    appeal_level: str

    has_urdu: float
    has_arabic: float
    has_multiple_parties: float
    has_headnotes: float

    citation_pattern: float

    judges_mentioned: str
    primary_judge: str
    judge_count: float
    bench_size: str

    expertise_constitutional: str
    expertise_criminal: str

    expertise_civil: float
    expertise_commercial: float
    expertise_family: float
    expertise_tax: float
    expertise_service: float
    expertise_election: float
    expertise_ip: float
    expertise_environmental: float

    primary_expertise_area: str

    expertise_diversity_score: float
    workload_score: float
    hearing_count: float
    adjournment_count: float
    previous_citations: float
    pending_references: float
    judgment_complexity: float
    historical_cases_count: float
    efficiency_score: float
    case_judge_match_score: float
    workload_capacity_score: float

    assignment_priority: str

    description: str = ""


@app.post("/predict-case-classification")
def predict_case_classification(
    data: CaseClassificationRequest
):

    if case_classification_model is None:

        return {
            "success": False,
            "error": "Case classification model is not loaded."
        }

    try:

        description = (
            str(data.description)
            .lower()
            .strip()
        )

        print("\nCASE DESCRIPTION:")
        print(description)


        # ====================================================
        # KEYWORDS
        # ====================================================

        criminal_keywords = [
            "murder",
            "attempted murder",
            "robbery",
            "theft",
            "kidnap",
            "kidnapping",
            "rape",
            "assault",
            "criminal",
            "crime",
            "fir",
            "police",
            "arrested",
            "accused",
            "weapon",
            "fraud",
            "drug",
            "narcotics",
            "burglary",
            "dacoity",
            "cheating",
            "homicide",
            "violence"
        ]


        family_keywords = [
            "divorce",
            "marriage",
            "husband",
            "wife",
            "child custody",
            "custody",
            "maintenance",
            "inheritance",
            "family",
            "khula",
            "dowry",
            "domestic",
            "parent",
            "children",
            "guardianship"
        ]


        property_keywords = [
            "property",
            "land",
            "plot",
            "house",
            "ownership",
            "possession",
            "rent",
            "tenant",
            "eviction",
            "estate",
            "boundary",
            "agricultural land"
        ]


        corporate_keywords = [
            "company",
            "corporate",
            "shareholder",
            "shares",
            "business",
            "partnership",
            "director",
            "corporation",
            "merger",
            "acquisition"
        ]


        employment_keywords = [
            "employee",
            "employer",
            "employment",
            "salary",
            "job",
            "termination",
            "dismissal",
            "workplace",
            "labour",
            "labor",
            "service benefits"
        ]


        consumer_keywords = [
            "consumer",
            "customer",
            "product",
            "service provider",
            "defective product",
            "refund",
            "purchase",
            "warranty",
            "complaint"
        ]


        civil_keywords = [
            "civil",
            "contract",
            "agreement",
            "damages",
            "compensation",
            "breach of contract",
            "civil dispute",
            "money dispute",
            "recovery"
        ]


        # ====================================================
        # KEYWORD SCORES
        # ====================================================

        scores = {
            "criminal": 0,
            "family": 0,
            "property": 0,
            "corporate": 0,
            "employment": 0,
            "consumer": 0,
            "civil": 0
        }


        keyword_groups = {

            "criminal": criminal_keywords,
            "family": family_keywords,
            "property": property_keywords,
            "corporate": corporate_keywords,
            "employment": employment_keywords,
            "consumer": consumer_keywords,
            "civil": civil_keywords
        }


        for case_type, keywords in keyword_groups.items():

            for keyword in keywords:

                if keyword in description:

                    scores[case_type] += 1


        print("\nAI KEYWORD SCORES:")
        print(scores)


        # ====================================================
        # DESCRIPTION CLASSIFICATION
        # ====================================================

        best_type = max(
            scores,
            key=scores.get
        )

        best_score = scores[best_type]


        if best_score > 0:

            prediction = best_type

            print(
                "\nDESCRIPTION BASED PREDICTION:",
                prediction
            )


        else:

            # =================================================
            # CATBOOST FALLBACK
            # =================================================

            input_data = [[

                data.year,
                data.page_count,
                data.word_count,
                data.character_count,
                data.sentence_count,
                data.paragraph_count,
                data.avg_word_per_page,

                str(data.case_subtype),

                data.classification_confidence,
                data.estimated_duration_days,
                data.complexity_score,
                data.case_age,

                str(data.charges),

                data.number_of_parties,
                data.total_citations,
                data.cases_cited_count,
                data.statutes_cited_count,
                data.foreign_citations,

                data.is_appeal,

                str(data.appeal_level),

                data.has_urdu,
                data.has_arabic,
                data.has_multiple_parties,
                data.has_headnotes,

                str(data.citation_pattern),

                str(data.judges_mentioned),
                str(data.primary_judge),

                data.judge_count,

                str(data.bench_size),

                str(data.expertise_constitutional),
                str(data.expertise_criminal),

                data.expertise_civil,
                data.expertise_commercial,
                data.expertise_family,
                data.expertise_tax,
                data.expertise_service,
                data.expertise_election,
                data.expertise_ip,
                data.expertise_environmental,

                str(data.primary_expertise_area),

                data.expertise_diversity_score,

                data.workload_score,
                data.hearing_count,
                data.adjournment_count,
                data.previous_citations,
                data.pending_references,
                data.judgment_complexity,
                data.historical_cases_count,
                data.efficiency_score,
                data.case_judge_match_score,
                data.workload_capacity_score,

                str(data.assignment_priority)
            ]]


            categorical_features = [
                7,
                12,
                19,
                24,
                25,
                26,
                28,
                29,
                30,
                39,
                51
            ]


            pool = Pool(
                data=input_data,
                cat_features=categorical_features
            )


            prediction = (
                case_classification_model
                .predict(pool)[0][0]
            )


            prediction = str(prediction)


            print(
                "\nCATBOOST FALLBACK PREDICTION:",
                prediction
            )


        # ====================================================
        # RETURN RESULT
        # ====================================================

        return {

            "success": True,

            "predicted_case_type":
                str(prediction),

            "keyword_scores":
                scores,

            "classification_method":
                (
                    "description_keywords"
                    if best_score > 0
                    else "catboost_model"
                )
        }


    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }


# ============================================================
# 3. CASE DURATION PREDICTION
# ============================================================

class DurationRequest(BaseModel):

    year: float
    page_count: float
    word_count: float
    character_count: float
    sentence_count: float

    avg_word_per_page: float

    case_number: str
    citation: str
    judgment_date: str
    judges: str
    bench: str
    headnotes: str
    acts_referred: str
    petitioner: str
    respondent: str
    case_type: str
    case_subtype: str

    classification_confidence: float
    complexity_score: float
    case_age: float

    charges: str
    sections_applied: str
    penalties: str
    imprisonment: str
    fines: str
    appellant: str

    number_of_parties: float
    total_citations: float
    cases_cited_count: float
    statutes_cited_count: float
    foreign_citations: float
    is_appeal: float

    appeal_level: str

    has_multiple_parties: float
    has_headnotes: float

    citation_pattern: str


@app.post("/predict-case-duration")
def predict_case_duration(data: DurationRequest):

    try:
        # 1. Base duration according to case type
        case_type = str(data.case_type).lower().strip()

        base_duration = {
            "civil": 160,
            "property": 170,
            "criminal": 190,
            "family": 120,
            "corporate": 220,
            "employment": 140,
            "consumer": 120,
            "constitutional": 240,
            "service": 150,
            "tax": 180,
            "election": 150
        }

        base_days = base_duration.get(case_type, 160)

        # 2. Complexity adjustment
        complexity = max(0.0, float(data.complexity_score))

        if complexity <= 1:
            complexity_level = complexity
        elif complexity <= 10:
            complexity_level = complexity / 10
        else:
            complexity_level = complexity / 100

        complexity_level = min(complexity_level, 1.0)
        complexity_multiplier = 0.75 + (complexity_level * 0.75)

        # 3. Number of parties adjustment
        parties = max(1, int(data.number_of_parties))
        party_multiplier = 1 + (
            min(max(parties - 2, 0), 8) * 0.025
        )

        # 4. Appeal adjustment
        is_appeal = float(data.is_appeal) > 0
        appeal_level = str(data.appeal_level).lower().strip()

        appeal_multiplier = 1.0

        if is_appeal:
            appeal_multiplier = 1.35

            if "supreme" in appeal_level:
                appeal_multiplier *= 1.20
            elif "high" in appeal_level:
                appeal_multiplier *= 1.10
            elif "second" in appeal_level:
                appeal_multiplier *= 1.10

        # 5. Criminal charges adjustment
        charges = str(data.charges).lower().strip()
        charges_multiplier = 1.0

        if case_type == "criminal" and charges not in [
            "", "none", "unknown", "no charges"
        ]:
            charges_multiplier = 1.08

        # 6. Calculate final estimated duration
        estimated_days = (
            base_days
            * complexity_multiplier
            * party_multiplier
            * appeal_multiplier
            * charges_multiplier
        )

        estimated_days = round(max(30, min(estimated_days, 1095)))

        return {
            "success": True,
            "predicted_duration_days": float(estimated_days),
            "estimation_method": "rule_based",
            "factors_used": {
                "case_type": case_type,
                "complexity_level": round(complexity_level, 2),
                "number_of_parties": parties,
                "is_appeal": is_appeal,
                "appeal_level": appeal_level
            },
            "disclaimer": (
                "Illustrative estimated duration, not a verified "
                "Pakistani court average."
            )
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# ============================================================
# 4. JUDGE RECOMMENDATION
# ============================================================

class JudgeRecommendationRequest(BaseModel):

    complexity_score: float

    estimated_duration_days: float

    number_of_parties: float

    case_age: float

    # IMPORTANT:
    # CatBoost trained this feature as categorical.
    # Therefore it MUST be string.
    appeal_level: str


@app.post("/recommend-judge")
def recommend_judge(
    data: JudgeRecommendationRequest
):

    if judge_model is None:

        return {
            "success": False,
            "error": "Judge recommendation model is not loaded."
        }


    try:

        # ====================================================
        # PREPARE DATA
        # ====================================================

        input_data = [[

            float(data.complexity_score),

            float(data.estimated_duration_days),

            float(data.number_of_parties),

            float(data.case_age),

            # IMPORTANT:
            # Do NOT convert this to float.
            str(data.appeal_level)
        ]]


        # ====================================================
        # CREATE DATAFRAME
        # ====================================================

        import pandas as pd

        input_dataframe = pd.DataFrame(
            input_data,
            columns=[
                "complexity_score",
                "estimated_duration_days",
                "number_of_parties",
                "case_age",
                "appeal_level"
            ]
        )


        print("\n" + "=" * 60)
        print("JUDGE RECOMMENDATION")
        print("=" * 60)

        print("\nInput:")
        print(input_dataframe)


        # ====================================================
        # PREDICTION
        # ====================================================

        prediction = judge_model.predict(
            input_dataframe
        )


        predicted_judge = str(
            prediction[0][0]
            if hasattr(prediction[0], "__len__")
            and not isinstance(prediction[0], str)
            else prediction[0]
        )


        # ====================================================
        # PROBABILITIES
        # ====================================================

        recommendations = []

        confidence = None


        if hasattr(
            judge_model,
            "predict_proba"
        ):

            probabilities = (
                judge_model
                .predict_proba(
                    input_dataframe
                )[0]
            )


            classes = judge_model.classes_


            ranked = sorted(
                zip(
                    classes,
                    probabilities
                ),
                key=lambda x: x[1],
                reverse=True
            )


            for judge_type, probability in ranked:

                recommendations.append({

                    "judge_type":
                        str(judge_type),

                    "confidence":
                        round(
                            float(probability) * 100,
                            2
                        )
                })


            if len(probabilities) > 0:

                confidence = round(
                    float(max(probabilities)) * 100,
                    2
                )


        print(
            "\nPredicted Judge:",
            predicted_judge
        )

        print(
            "Confidence:",
            confidence,
            "%"
        )

        print("\nRecommendations:")

        for item in recommendations:

            print(
                f"{item['judge_type']}: "
                f"{item['confidence']}%"
            )


        # ====================================================
        # RETURN
        # ====================================================

        return {

            "success": True,

            "recommended_judge":
                predicted_judge,

            "predicted_judge_type":
                predicted_judge,

            "confidence":
                confidence,

            "recommendations":
                recommendations,

            "features_used": {

                "complexity_score":
                    data.complexity_score,

                "estimated_duration_days":
                    data.estimated_duration_days,

                "number_of_parties":
                    data.number_of_parties,

                "case_age":
                    data.case_age,

                "appeal_level":
                    data.appeal_level
            }
        }


    except Exception as e:

        print("\nJUDGE RECOMMENDATION ERROR:")
        print(e)


        return {

            "success": False,

            "error":
                str(e)
        }


# ============================================================
# API HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {

        "status": "healthy",

        "priority_model":
            priority_model is not None,

        "case_classification_model":
            case_classification_model is not None,

        "duration_model":
            duration_model is not None,

        "judge_model":
            judge_model is not None
    }



# ============================================================
# 5. HYPERLEDGER FABRIC BLOCKCHAIN INTEGRATION
# ============================================================

FABRIC_GATEWAY_URL = os.getenv(
    "FABRIC_GATEWAY_URL",
    "http://localhost:8080"
)


class BlockchainRegisterRequest(BaseModel):
    caseId: str
    caseType: str
    documentHash: str
    registeredBy: str = "Admin"


def call_fabric_gateway(path, method="GET", payload=None):

    url = f"{FABRIC_GATEWAY_URL}{path}"

    headers = {
        "Content-Type": "application/json"
    }

    body = (
        json.dumps(payload).encode("utf-8")
        if payload is not None
        else None
    )

    request = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method=method
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=35
        ) as response:

            return json.loads(
                response.read().decode("utf-8")
            )

    except urllib.error.HTTPError as e:

        error_message = e.read().decode("utf-8")

        if (
            e.code == 500
            and "does not exist" in error_message.lower()
        ):
            return {
                "caseId": path.split("caseId=")[-1],
                "status": "NOT_REGISTERED",
                "message": "This case is not registered on blockchain."
            }

        raise HTTPException(
            status_code=e.code,
            detail=error_message
        )

    except Exception as e:

        raise HTTPException(
            status_code=502,
            detail=f"Fabric Gateway connection failed: {str(e)}"
        )

@app.post("/blockchain/register-case")
def blockchain_register_case(data: BlockchainRegisterRequest):

    if len(data.documentHash) != 64:
        raise HTTPException(
            status_code=400,
            detail="Document hash must be a SHA-256 hash (64 hexadecimal characters)."
        )

    try:
        int(data.documentHash, 16)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid SHA-256 document hash."
        )

    result = call_fabric_gateway(
        "/register-case",
        method="POST",
        payload=data.model_dump()
    )

    return result

@app.post("/blockchain/verify-case")
def blockchain_verify_case(data: dict):

    if not data.get("caseId"):
        raise HTTPException(status_code=400, detail="caseId is required")

    return call_fabric_gateway(
        "/verify-case",
        method="POST",
        payload={"caseId": data["caseId"]}
    )


@app.post("/blockchain/verify-document")
def blockchain_verify_document(data: dict):

    case_id = data.get("caseId")
    updated_hash = data.get("updatedDocumentHash") or data.get("documentHash")
    actor_id = data.get("actorId", "System")

    if not case_id or not updated_hash:
        raise HTTPException(
            status_code=400,
            detail="caseId and updatedDocumentHash are required"
        )

    if not isinstance(updated_hash, str) or len(updated_hash) != 64:
        raise HTTPException(
            status_code=400,
            detail="Invalid SHA-256 document hash"
        )

    try:
        int(updated_hash, 16)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid SHA-256 document hash"
        )

    # STEP 1: Fetch original case record directly from Hyperledger Fabric
    fabric_record = call_fabric_gateway(
        f"/case?caseId={urllib.parse.quote(case_id)}",
        method="GET"
    )

    if not isinstance(fabric_record, dict):
        raise HTTPException(
            status_code=404,
            detail="Case not found on Hyperledger Fabric"
        )

    original_hash = fabric_record.get("documentHash")

    if not original_hash:
        raise HTTPException(
            status_code=404,
            detail="Original document hash not found on blockchain"
        )

    # STEP 2: Compare Firebase current hash with Fabric original hash
    is_authentic = (updated_hash.lower() == original_hash.lower())

    if is_authentic:
        return {
            "success": True,
            "isAuthentic": True,
            "message": "Case is Authentic",
            "originalBlockchainHash": original_hash,
            "currentDatabaseHash": updated_hash,
            "historyRecorded": False
        }

    # STEP 3: Prepare tampering event
    event_details = (
        "TAMPERING DETECTED. "
        f"Original Blockchain Hash: {original_hash}. "
        f"Updated Database Hash: {updated_hash}."
    )

    # STEP 4: Check existing blockchain history
    history_result = call_fabric_gateway(
        f"/case-history?caseId={urllib.parse.quote(case_id)}",
        method="GET"
    )

    existing_events = []

    def collect_events(value):
        if isinstance(value, list):
            for item in value:
                collect_events(item)

        elif isinstance(value, dict):
            if value.get("eventType") is not None:
                existing_events.append(value)

            for item in value.values():
                if isinstance(item, (list, dict)):
                    collect_events(item)

    collect_events(history_result)

    duplicate_found = any(
        event.get("eventType") == "TAMPERING_DETECTED"
        and event.get("details") == event_details
        for event in existing_events
    )

    # STEP 5: Prevent duplicate tampering events
    if duplicate_found:
        return {
            "success": True,
            "isAuthentic": False,
            "message": "Document Not Authentic",
            "originalBlockchainHash": original_hash,
            "currentDatabaseHash": updated_hash,
            "historyRecorded": False,
            "duplicatePrevented": True
        }

    # STEP 6: Record new tampering event on Fabric
    event_result = call_fabric_gateway(
        "/record-case-event",
        method="POST",
        payload={
            "caseId": case_id,
            "eventType": "TAMPERING_DETECTED",
            "details": event_details,
            "actorId": actor_id
        }
    )

    return {
        "success": True,
        "isAuthentic": False,
        "message": "Document Not Authentic",
        "originalBlockchainHash": original_hash,
        "currentDatabaseHash": updated_hash,
        "historyRecorded": True,
        "duplicatePrevented": False,
        "blockchainEvent": event_result
    }


@app.post("/blockchain/register-document")
def blockchain_register_document(data: dict):
    required = ["caseId", "documentHash", "fileName", "uploadedBy"]

    if not all(data.get(field) for field in required):
        raise HTTPException(
            status_code=400,
            detail="All document fields are required"
        )

    return call_fabric_gateway(
        "/register-document",
        method="POST",
        payload={
            "caseId": data["caseId"],
            "documentHash": data["documentHash"],
            "fileName": data["fileName"],
            "uploadedBy": data["uploadedBy"]
        }
    )
@app.post("/blockchain/assign-judge")
def blockchain_assign_judge(data: dict):

    required = ["caseId", "judgeId"]

    if not all(data.get(field) for field in required):
        raise HTTPException(
            status_code=400,
            detail="caseId and judgeId are required"
        )

    return call_fabric_gateway(
        "/assign-judge",
        method="POST",
        payload={
            "caseId": data["caseId"],
            "judgeId": data["judgeId"]
        }
    )
@app.post("/blockchain/schedule-hearing")
def blockchain_schedule_hearing(data: dict):
    required = ["caseId", "hearingDate"]

    if not all(data.get(field) for field in required):
        raise HTTPException(
            status_code=400,
            detail="caseId and hearingDate are required"
        )

    return call_fabric_gateway(
        "/schedule-hearing",
        method="POST",
        payload={
            "caseId": data["caseId"],
            "hearingDate": data["hearingDate"]
        }
    )


@app.post("/blockchain/record-case-event")
def blockchain_record_case_event(data: dict):

    required = ["caseId", "eventType", "details", "actorId"]

    if not all(data.get(field) for field in required):
        raise HTTPException(
            status_code=400,
            detail="All event fields are required"
        )

    return call_fabric_gateway(
        "/record-case-event",
        method="POST",
        payload=data
    )

@app.get("/blockchain/case-history/{case_id}")
def blockchain_case_history(case_id: str):

    if not case_id:
        raise HTTPException(
            status_code=400,
            detail="caseId is required"
        )

    return call_fabric_gateway(
        f"/case-history?caseId={urllib.parse.quote(case_id)}",
        method="GET"
    )


@app.get("/blockchain/case/{case_id}")
def blockchain_get_case(case_id: str):

    result = call_fabric_gateway(
        f"/case?caseId={quote(case_id)}"
    )

    return result
@app.post("/blockchain/record-order")
def blockchain_record_order(data: dict):

    required = ["caseId", "orderHash", "actorId"]

    if not all(data.get(field) for field in required):
        raise HTTPException(
            status_code=400,
            detail="All order fields are required"
        )

    return call_fabric_gateway(
        "/record-order",
        method="POST",
        payload=data
    )


@app.get("/blockchain/get-order/{case_id}")
def blockchain_get_order(case_id: str):

    if not case_id:
        raise HTTPException(
            status_code=400,
            detail="caseId is required"
        )

    return call_fabric_gateway(
        f"/get-order?caseId={quote(case_id)}"
    )

@app.get("/blockchain/case-history/{case_id}")
def blockchain_case_history(case_id: str):

    if not case_id:
        raise HTTPException(
            status_code=400,
            detail="caseId is required"
        )

    return call_fabric_gateway(
        "/case-history",
        method="GET",
        params={"caseId": case_id}
    )


@app.get("/blockchain/health")
def blockchain_health():

    result = call_fabric_gateway("/health")

    return {
        "success": True,
        "blockchain": result
    }


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
