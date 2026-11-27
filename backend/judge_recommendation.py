
import os
import pickle
from typing import Dict, Any

import pandas as pd


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "final_judge_recommendation_model.pkl"
)

FEATURES_PATH = os.path.join(
    BASE_DIR,
    "models",
    "judge_model_features.pkl"
)


# =========================================================
# LOAD MODEL
# =========================================================

try:
    with open(MODEL_PATH, "rb") as model_file:
        judge_model = pickle.load(model_file)

    print("Judge recommendation model loaded successfully.")

except Exception as e:
    judge_model = None

    print("ERROR: Could not load judge recommendation model.")
    print(e)


# =========================================================
# LOAD FEATURES
# =========================================================

try:
    with open(FEATURES_PATH, "rb") as feature_file:
        MODEL_FEATURES = pickle.load(feature_file)

    print("Judge model features loaded successfully.")
    print("Features:", MODEL_FEATURES)

except Exception as e:

    print("WARNING: Could not load feature file.")
    print(e)

    MODEL_FEATURES = [
        "complexity_score",
        "estimated_duration_days",
        "number_of_parties",
        "case_age",
        "appeal_level"
    ]

    print("Using default features:")
    print(MODEL_FEATURES)


# =========================================================
# MODEL CLASSES
# =========================================================

JUDGE_TYPES = [
    "Civil Judge",
    "Commercial Judge",
    "Constitutional Bench",
    "Criminal Judge",
    "Election Tribunal",
    "Family Judge",
    "General Judge",
    "Service Tribunal",
    "Tax Judge"
]


# =========================================================
# SAFE NUMBER CONVERSION
# =========================================================

def to_number(value, default=0):
    """
    Safely converts a value into a number.
    """

    if value is None:
        return default

    if isinstance(value, bool):
        return int(value)

    try:
        return float(value)

    except (ValueError, TypeError):
        return default


# =========================================================
# PREPARE FEATURES
# =========================================================

def prepare_features(case_data: Dict[str, Any]) -> pd.DataFrame:
    """
    Converts case information into the exact
    feature structure required by the trained
    CatBoost judge recommendation model.

    IMPORTANT:
    appeal_level is categorical in the trained model,
    therefore it is converted to STRING.
    """

    # -----------------------------------------------------
    # Numeric features
    # -----------------------------------------------------

    complexity_score = to_number(
        case_data.get(
            "complexity_score",
            0
        )
    )

    estimated_duration_days = to_number(
        case_data.get(
            "estimated_duration_days",
            0
        )
    )

    number_of_parties = to_number(
        case_data.get(
            "number_of_parties",
            0
        )
    )

    case_age = to_number(
        case_data.get(
            "case_age",
            0
        )
    )

    # -----------------------------------------------------
    # Categorical feature
    # -----------------------------------------------------

    appeal_level = case_data.get(
        "appeal_level",
        0
    )

    if appeal_level is None:
        appeal_level = "0"
    else:
        appeal_level = str(appeal_level)

    # -----------------------------------------------------
    # Create feature dictionary
    # -----------------------------------------------------

    features = {

        "complexity_score":
            complexity_score,

        "estimated_duration_days":
            estimated_duration_days,

        "number_of_parties":
            number_of_parties,

        "case_age":
            case_age,

        "appeal_level":
            appeal_level
    }

    # -----------------------------------------------------
    # Keep EXACT training feature order
    # -----------------------------------------------------

    row = []

    for feature in MODEL_FEATURES:

        if feature == "appeal_level":

            # CatBoost categorical feature
            row.append(
                str(features.get(feature, "0"))
            )

        else:

            row.append(
                features.get(feature, 0)
            )

    dataframe = pd.DataFrame(
        [row],
        columns=MODEL_FEATURES
    )

    return dataframe


# =========================================================
# PREDICT JUDGE TYPE
# =========================================================

def recommend_judge_type(
    case_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Predicts the most suitable judge type
    for a submitted case.
    """

    # -----------------------------------------------------
    # Check model
    # -----------------------------------------------------

    if judge_model is None:

        return {
            "success": False,
            "predicted_judge_type": None,
            "confidence": None,
            "recommendations": [],
            "error":
                "Judge recommendation model is not loaded."
        }

    try:

        # -------------------------------------------------
        # Prepare input
        # -------------------------------------------------

        input_data = prepare_features(
            case_data
        )

        # -------------------------------------------------
        # Prediction
        # -------------------------------------------------

        prediction = judge_model.predict(
            input_data
        )

        # -------------------------------------------------
        # CatBoost prediction can be:
        #
        # [['Constitutional Bench']]
        #
        # Extract safely.
        # -------------------------------------------------

        try:

            if hasattr(
                prediction,
                "ndim"
            ) and prediction.ndim > 1:

                predicted_judge_type = (
                    prediction[0][0]
                )

            else:

                predicted_judge_type = (
                    prediction[0]
                )

        except Exception:

            predicted_judge_type = (
                prediction[0]
            )

        predicted_judge_type = str(
            predicted_judge_type
        )

        # -------------------------------------------------
        # Probabilities
        # -------------------------------------------------

        recommendations = []

        confidence = None

        if hasattr(
            judge_model,
            "predict_proba"
        ):

            probabilities = (
                judge_model.predict_proba(
                    input_data
                )[0]
            )

            classes = (
                judge_model.classes_
            )

            # ---------------------------------------------
            # Rank all judge types
            # ---------------------------------------------

            ranked = sorted(
                zip(
                    classes,
                    probabilities
                ),
                key=lambda item: item[1],
                reverse=True
            )

            # ---------------------------------------------
            # Build recommendation list
            # ---------------------------------------------

            for judge_type, probability in ranked:

                recommendations.append({

                    "judge_type":
                        str(judge_type),

                    "confidence":
                        round(
                            float(
                                probability
                            ) * 100,
                            2
                        )
                })

            # ---------------------------------------------
            # Highest probability
            # ---------------------------------------------

            if len(probabilities) > 0:

                confidence = round(
                    float(
                        max(probabilities)
                    ) * 100,
                    2
                )

        # -------------------------------------------------
        # Return final result
        # -------------------------------------------------

        return {

            "success": True,

            "predicted_judge_type":
                predicted_judge_type,

            "confidence":
                confidence,

            "recommendations":
                recommendations,

            "features_used": {

                "complexity_score":
                    case_data.get(
                        "complexity_score",
                        0
                    ),

                "estimated_duration_days":
                    case_data.get(
                        "estimated_duration_days",
                        0
                    ),

                "number_of_parties":
                    case_data.get(
                        "number_of_parties",
                        0
                    ),

                "case_age":
                    case_data.get(
                        "case_age",
                        0
                    ),

                "appeal_level":
                    case_data.get(
                        "appeal_level",
                        0
                    )
            }
        }

    except Exception as e:

        print()
        print(
            "ERROR during judge prediction:"
        )
        print(e)

        return {

            "success": False,

            "predicted_judge_type":
                None,

            "confidence":
                None,

            "recommendations":
                [],

            "error":
                str(e)
        }


# =========================================================
# SIMPLE TEST FUNCTION
# =========================================================

def test_judge_recommendation():

    # -----------------------------------------------------
    # Sample case
    # -----------------------------------------------------

    sample_case = {

        "complexity_score":
            7,

        "estimated_duration_days":
            120,

        "number_of_parties":
            4,

        "case_age":
            30,

        "appeal_level":
            1
    }

    print()
    print("=" * 60)
    print(
        "JUDGE RECOMMENDATION TEST"
    )
    print("=" * 60)

    # -----------------------------------------------------
    # Prepare input
    # -----------------------------------------------------

    input_data = prepare_features(
        sample_case
    )

    print()
    print(
        "Input Features:"
    )

    print(input_data)

    # -----------------------------------------------------
    # Call recommendation function
    # -----------------------------------------------------

    result = recommend_judge_type(
        sample_case
    )

    # -----------------------------------------------------
    # Display result
    # -----------------------------------------------------

    print()
    print(
        "Predicted Judge Type:",
        result.get(
            "predicted_judge_type"
        )
    )

    print()
    print(
        "Confidence:",
        result.get(
            "confidence"
        ),
        "%"
    )

    print()
    print(
        "Recommendations:"
    )

    recommendations = result.get(
        "recommendations",
        []
    )

    if recommendations:

        for recommendation in recommendations:

            print(
                f"{recommendation['judge_type']}: "
                f"{recommendation['confidence']}%"
            )

    else:

        print(
            "No recommendations available."
        )

    # -----------------------------------------------------
    # Error if any
    # -----------------------------------------------------

    if not result.get("success"):

        print()
        print(
            "ERROR:"
        )

        print(
            result.get(
                "error"
            )
        )

    print()
    print("=" * 60)


# =========================================================
# RUN TEST
# =========================================================

if __name__ == "__main__":

    test_judge_recommendation()
