package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

var contract *client.Contract

func connectGateway() (*client.Gateway, *grpc.ClientConn, error) {
	basePath := filepath.Join(
		os.Getenv("HOME"),
		"fabric-project",
		"fabric-samples",
		"test-network",
		"organizations",
		"peerOrganizations",
		"org1.example.com",
	)

	certPath := filepath.Join(
		basePath,
		"users", "Admin@org1.example.com", "msp",
		"signcerts", "cert.pem",
	)

	keyDir := filepath.Join(
		basePath,
		"users", "Admin@org1.example.com", "msp",
		"keystore",
	)

	tlsPath := filepath.Join(
		basePath,
		"peers", "peer0.org1.example.com",
		"tls", "ca.crt",
	)

	// Read Admin certificate
	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		return nil, nil, fmt.Errorf("read certificate: %w", err)
	}

	certificate, err := identity.CertificateFromPEM(certPEM)
	if err != nil {
		return nil, nil, fmt.Errorf("parse certificate: %w", err)
	}

	// Read Admin private key
	keyFiles, err := os.ReadDir(keyDir)
	if err != nil {
		return nil, nil, fmt.Errorf("read keystore: %w", err)
	}

	var keyPEM []byte

	for _, file := range keyFiles {
		if file.IsDir() {
			continue
		}

		keyPEM, err = os.ReadFile(filepath.Join(keyDir, file.Name()))
		if err != nil {
			return nil, nil, fmt.Errorf("read private key: %w", err)
		}
		break
	}

	if len(keyPEM) == 0 {
		return nil, nil, fmt.Errorf("private key not found")
	}

	privateKey, err := identity.PrivateKeyFromPEM(keyPEM)
	if err != nil {
		return nil, nil, fmt.Errorf("parse private key: %w", err)
	}

	sign, err := identity.NewPrivateKeySign(privateKey)
	if err != nil {
		return nil, nil, fmt.Errorf("create signer: %w", err)
	}

	id, err := identity.NewX509Identity("Org1MSP", certificate)
	if err != nil {
		return nil, nil, fmt.Errorf("create identity: %w", err)
	}

	// Configure peer TLS
	tlsPEM, err := os.ReadFile(tlsPath)
	if err != nil {
		return nil, nil, fmt.Errorf("read TLS certificate: %w", err)
	}

	certPool := x509.NewCertPool()

	if !certPool.AppendCertsFromPEM(tlsPEM) {
		return nil, nil, fmt.Errorf("load peer TLS certificate failed")
	}

	tlsCredentials := credentials.NewTLS(&tls.Config{
		RootCAs: certPool,
	})

	// Connect to Org1 peer
	conn, err := grpc.NewClient(
		"localhost:7051",
		grpc.WithTransportCredentials(tlsCredentials),
		grpc.WithAuthority("peer0.org1.example.com"),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("create gRPC connection: %w", err)
	}

	// Connect Fabric Gateway
	gateway, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(conn),
	)

	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("connect Fabric Gateway: %w", err)
	}

	return gateway, conn, nil
}

// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status":    "running",
		"service":   "AdaalatChain Fabric Gateway",
		"channel":   "mychannel",
		"chaincode": "adaalatchain",
	}

	json.NewEncoder(w).Encode(response)
}

// Read case from blockchain
// Read case from blockchain
func getCaseHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	caseID := r.URL.Query().Get("caseId")

	if caseID == "" {
		http.Error(w, "caseId is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	result, err := contract.EvaluateWithContext(
		ctx,
		"GetCase",
		client.WithArguments(caseID),
	)

	if err != nil {
		log.Printf("GetCase failed: %v", err)

		if strings.Contains(strings.ToLower(err.Error()), "does not exist") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{
				"caseId":  caseID,
				"status":  "NOT_REGISTERED",
				"message": "This case is not registered on blockchain.",
			})
			return
		}

		http.Error(w, "Blockchain query failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(result)
}

type RegisterCaseRequest struct {
	CaseID       string `json:"caseId"`
	CaseType     string `json:"caseType"`
	DocumentHash string `json:"documentHash"`
	RegisteredBy string `json:"registeredBy"`
}
type RegisterDocumentRequest struct {
	CaseID       string `json:"caseId"`
	DocumentHash string `json:"documentHash"`
	FileName     string `json:"fileName"`
	UploadedBy   string `json:"uploadedBy"`
}

func registerCaseHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request RegisterCaseRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	if request.CaseID == "" || request.CaseType == "" ||
		request.DocumentHash == "" || request.RegisteredBy == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	proposal, err := contract.NewProposal(
		"RegisterCase",
		client.WithArguments(
			request.CaseID,
			request.CaseType,
			request.DocumentHash,
			request.RegisteredBy,
		),
		client.WithEndorsingOrganizations("Org1MSP", "Org2MSP"),
	)
	if err != nil {
		log.Printf("Proposal creation failed: %v", err)
		http.Error(w, "Blockchain proposal failed", http.StatusBadGateway)
		return
	}

	transaction, err := proposal.Endorse()
	if err != nil {
		log.Printf("Endorsement failed: %v", err)
		http.Error(w, "Blockchain endorsement failed", http.StatusBadGateway)
		return
	}

	commit, err := transaction.SubmitWithContext(ctx)
	if err != nil {
		log.Printf("Transaction submission failed: %v", err)
		http.Error(w, "Blockchain submission failed", http.StatusBadGateway)
		return
	}

	status, err := commit.StatusWithContext(ctx)
	if err != nil {
		log.Printf("Commit status failed: %v", err)
		http.Error(w, "Blockchain commit verification failed", http.StatusBadGateway)
		return
	}

	if !status.Successful {
		log.Printf("Transaction validation failed: %v", status.Code)
		http.Error(w, "Blockchain transaction was not committed successfully", http.StatusBadGateway)
		return
	}

	if err != nil {
		log.Printf("RegisterCase failed: %v", err)
		http.Error(w, "Blockchain registration failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Case registered on blockchain",
		"caseId":  request.CaseID,
	})
}

type AssignJudgeRequest struct {
	CaseID  string `json:"caseId"`
	JudgeID string `json:"judgeId"`
}
type ScheduleHearingRequest struct {
	CaseID      string `json:"caseId"`
	HearingDate string `json:"hearingDate"`
}
type VerifyCaseRequest struct {
	CaseID string `json:"caseId"`
}

type RecordCaseEventRequest struct {
	CaseID    string `json:"caseId"`
	EventType string `json:"eventType"`
	Details   string `json:"details"`
	ActorID   string `json:"actorId"`
}

type RecordOrderRequest struct {
	CaseID    string `json:"caseId"`
	OrderHash string `json:"orderHash"`
	ActorID   string `json:"actorId"`
}

func recordOrderHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request RecordOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	if request.CaseID == "" || request.OrderHash == "" || request.ActorID == "" {
		http.Error(w, "caseId, orderHash and actorId are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := submitBlockchainTransaction(
		ctx, "RecordOrder",
		request.CaseID, request.OrderHash, request.ActorID,
	); err != nil {
		log.Printf("RecordOrder failed: %v", err)
		http.Error(w, "Blockchain order recording failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Court order recorded on blockchain",
		"caseId":  request.CaseID,
	})
}

func getOrderHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	caseID := r.URL.Query().Get("caseId")
	if caseID == "" {
		http.Error(w, "caseId is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	result, err := contract.EvaluateWithContext(
		ctx, "GetOrder", client.WithArguments(caseID),
	)
	if err != nil {
		log.Printf("GetOrder failed: %v", err)
		http.Error(w, "Blockchain order query failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(result)
}
func submitBlockchainTransaction(ctx context.Context, name string, args ...string) error {
	proposal, err := contract.NewProposal(
		name,
		client.WithArguments(args...),
		client.WithEndorsingOrganizations("Org1MSP", "Org2MSP"),
	)
	if err != nil {
		return fmt.Errorf("create proposal: %w", err)
	}

	transaction, err := proposal.Endorse()
	if err != nil {
		return fmt.Errorf("endorsement: %w", err)
	}

	commit, err := transaction.SubmitWithContext(ctx)
	if err != nil {
		return fmt.Errorf("submit transaction: %w", err)
	}

	status, err := commit.StatusWithContext(ctx)
	if err != nil {
		return fmt.Errorf("commit status: %w", err)
	}

	if !status.Successful {
		return fmt.Errorf("transaction validation failed: %v", status.Code)
	}
	return nil
}
func scheduleHearingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request ScheduleHearingRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	if request.CaseID == "" || request.HearingDate == "" {
		http.Error(w, "caseId and hearingDate are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := submitBlockchainTransaction(ctx, "ScheduleHearing", request.CaseID, request.HearingDate); err != nil {
		log.Printf("ScheduleHearing failed: %v", err)
		http.Error(w, "Blockchain hearing scheduling failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":      "success",
		"message":     "Hearing scheduled on blockchain",
		"caseId":      request.CaseID,
		"hearingDate": request.HearingDate,
	})
}
func assignJudgeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request AssignJudgeRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	if request.CaseID == "" || request.JudgeID == "" {
		http.Error(w, "caseId and judgeId are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := submitBlockchainTransaction(
		ctx,
		"AssignJudge",
		request.CaseID,
		request.JudgeID,
	); err != nil {
		log.Printf("AssignJudge failed: %v", err)
		http.Error(w, "Blockchain judge assignment failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Judge assigned on blockchain",
		"caseId":  request.CaseID,
		"judgeId": request.JudgeID,
	})
}

type VerifyDocumentRequest struct {
	CaseID       string `json:"caseId"`
	DocumentHash string `json:"documentHash"`
}

func verifyDocumentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request VerifyDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	if request.CaseID == "" || request.DocumentHash == "" {
		http.Error(w, "caseId and documentHash are required", http.StatusBadRequest)
		return
	}

	result, err := contract.EvaluateTransaction(
		"VerifyDocument",
		request.CaseID,
		request.DocumentHash,
	)
	if err != nil {
		log.Printf("VerifyDocument failed: %v", err)
		http.Error(w, "Blockchain document verification failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(result)
}
func registerDocumentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request RegisterDocumentRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	if request.CaseID == "" || request.DocumentHash == "" ||
		request.FileName == "" || request.UploadedBy == "" {
		http.Error(w, "All document fields are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	proposal, err := contract.NewProposal(
		"RegisterDocument",
		client.WithArguments(
			request.CaseID,
			request.DocumentHash,
			request.FileName,
			request.UploadedBy,
		),
		client.WithEndorsingOrganizations("Org1MSP", "Org2MSP"),
	)
	if err != nil {
		log.Printf("Document proposal creation failed: %v", err)
		http.Error(w, "Blockchain proposal failed", http.StatusBadGateway)
		return
	}

	transaction, err := proposal.Endorse()
	if err != nil {
		log.Printf("Document endorsement failed: %v", err)
		http.Error(w, "Blockchain endorsement failed", http.StatusBadGateway)
		return
	}

	commit, err := transaction.SubmitWithContext(ctx)
	if err != nil {
		log.Printf("Document submission failed: %v", err)
		http.Error(w, "Blockchain submission failed", http.StatusBadGateway)
		return
	}

	status, err := commit.StatusWithContext(ctx)
	if err != nil {
		log.Printf("Document commit status failed: %v", err)
		http.Error(w, "Blockchain commit confirmation failed", http.StatusBadGateway)
		return
	}

	if !status.Successful {
		http.Error(w, "Document transaction was not successful", http.StatusBadGateway)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "Document registered on blockchain",
"transactionId": commit.TransactionID(),
	})
}

func verifyCaseHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request VerifyCaseRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}
	if request.CaseID == "" {
		http.Error(w, "caseId is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := submitBlockchainTransaction(ctx, "VerifyCase", request.CaseID); err != nil {
		log.Printf("VerifyCase failed: %v", err)
		http.Error(w, "Blockchain case verification failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Case verified on blockchain",
		"caseId":  request.CaseID,
	})
}

func getCaseHistoryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	caseID := r.URL.Query().Get("caseId")
	if caseID == "" {
		http.Error(w, "caseId is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	result, err := contract.EvaluateWithContext(
		ctx,
		"GetCaseHistory",
		client.WithArguments(caseID),
	)

	if err != nil {
		log.Printf("GetCaseHistory failed: %v", err)
		http.Error(w, "Blockchain history query failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(result)
}

func recordCaseEventHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request RecordCaseEventRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}
	if request.CaseID == "" || request.EventType == "" || request.ActorID == "" {
		http.Error(w, "caseId, eventType and actorId are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := submitBlockchainTransaction(
		ctx, "RecordCaseEvent",
		request.CaseID, request.EventType, request.Details, request.ActorID,
	); err != nil {
		log.Printf("RecordCaseEvent failed: %v", err)
		http.Error(w, "Blockchain event recording failed", http.StatusBadGateway)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Case event recorded on blockchain",
		"caseId":  request.CaseID,
	})
}

func main() {
	log.Println("Starting AdaalatChain Fabric Gateway...")

	gateway, conn, err := connectGateway()
	if err != nil {
		log.Fatalf("Fabric connection failed: %v", err)
	}

	defer gateway.Close()
	defer conn.Close()

	network := gateway.GetNetwork("mychannel")

	contract = network.GetContractWithName(
		"adaalatchain",
		"SmartCourtContract",
	)

	log.Println("Fabric Gateway connected successfully")
	log.Println("Channel: mychannel")
	log.Println("Chaincode: adaalatchain")
	log.Println("Contract: SmartCourtContract")

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/case", getCaseHandler)
	http.HandleFunc("/register-case", registerCaseHandler)
	http.HandleFunc("/verify-case", verifyCaseHandler)

	http.HandleFunc("/verify-document", verifyDocumentHandler)
	http.HandleFunc("/register-document", registerDocumentHandler)
	http.HandleFunc("/assign-judge", assignJudgeHandler)
	http.HandleFunc("/schedule-hearing", scheduleHearingHandler)
	http.HandleFunc("/case-history", getCaseHistoryHandler)
	http.HandleFunc("/record-case-event", recordCaseEventHandler)
	http.HandleFunc("/record-order", recordOrderHandler)
	http.HandleFunc("/get-order", getOrderHandler)
	server := &http.Server{
		Addr:              "0.0.0.0:8080",
		Handler:           http.DefaultServeMux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("Gateway HTTP service listening on port 8080")

	if err := server.ListenAndServe(); err != nil &&
		err != http.ErrServerClosed {
		log.Fatalf("HTTP server failed: %v", err)
	}
}
