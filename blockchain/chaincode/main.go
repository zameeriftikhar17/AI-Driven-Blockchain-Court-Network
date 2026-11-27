package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartCourtContract struct {
	contractapi.Contract
}

type CourtCase struct {
	CaseID        string `json:"caseId"`
	CaseType      string `json:"caseType"`
	DocumentHash  string `json:"documentHash"`
	Status        string `json:"status"`
	AssignedJudge string `json:"assignedJudge"`
	HearingDate   string `json:"hearingDate"`
	CreatedAt     string `json:"createdAt"`
}

type CaseEvent struct {
	EventType string `json:"eventType"`
	Details   string `json:"details"`
	ActorID   string `json:"actorId"`
	Timestamp string `json:"timestamp"`
}

func txTime(ctx contractapi.TransactionContextInterface) (string, error) {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	return time.Unix(ts.Seconds, int64(ts.Nanos)).UTC().Format(time.RFC3339), nil
}

func (s *SmartCourtContract) RegisterCase(ctx contractapi.TransactionContextInterface, caseID, caseType, documentHash, registeredBy string) error {
	if caseID == "" || caseType == "" || documentHash == "" || registeredBy == "" {
		return fmt.Errorf("all case fields are required")
	}
	exists, err := ctx.GetStub().GetState(caseID)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("case %s already exists", caseID)
	}
	createdAt, err := txTime(ctx)
	if err != nil {
		return err
	}
	caseData := CourtCase{
		CaseID: caseID, CaseType: caseType, DocumentHash: documentHash,
		Status: "REGISTERED", CreatedAt: createdAt,
	}
	data, err := json.Marshal(caseData)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState(caseID, data); err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("CaseRegistered", data)
}

func (s *SmartCourtContract) VerifyCase(ctx contractapi.TransactionContextInterface, caseID string) error {
	caseData, err := s.getCase(ctx, caseID)
	if err != nil {
		return err
	}
	caseData.Status = "VERIFIED"
	data, err := json.Marshal(caseData)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(caseID, data)
}

func (s *SmartCourtContract) GetCase(ctx contractapi.TransactionContextInterface, caseID string) (*CourtCase, error) {
	return s.getCase(ctx, caseID)
}

func (s *SmartCourtContract) AssignJudge(ctx contractapi.TransactionContextInterface, caseID, judgeID string) error {
	if judgeID == "" {
		return fmt.Errorf("judge ID is required")
	}
	caseData, err := s.getCase(ctx, caseID)
	if err != nil {
		return err
	}
	caseData.AssignedJudge = judgeID
	data, err := json.Marshal(caseData)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(caseID, data)
}

func (s *SmartCourtContract) ScheduleHearing(ctx contractapi.TransactionContextInterface, caseID, hearingDate string) error {
	if _, err := time.Parse("2006-01-02", hearingDate); err != nil {
		return fmt.Errorf("hearing date must use YYYY-MM-DD")
	}
	caseData, err := s.getCase(ctx, caseID)
	if err != nil {
		return err
	}
	caseData.HearingDate = hearingDate
	data, err := json.Marshal(caseData)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(caseID, data)
}

func (s *SmartCourtContract) UpdateHearing(ctx contractapi.TransactionContextInterface, caseID, newDate string) error {
	return s.ScheduleHearing(ctx, caseID, newDate)
}

func (s *SmartCourtContract) RecordOrder(ctx contractapi.TransactionContextInterface, caseID, orderHash, actorID string) error {
	if orderHash == "" || actorID == "" {
		return fmt.Errorf("order hash and actor ID are required")
	}
	if _, err := s.getCase(ctx, caseID); err != nil {
		return err
	}
	timestamp, err := txTime(ctx)
	if err != nil {
		return err
	}
	order := map[string]string{
		"caseId": caseID, "orderHash": orderHash,
		"actorID": actorID, "timestamp": timestamp,
	}
	data, err := json.Marshal(order)
	if err != nil {
		return err
	}
	if err := ctx.GetStub().PutState("ORDER_"+caseID, data); err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("CourtOrderRecorded", data)
}

func (s *SmartCourtContract) GetOrder(ctx contractapi.TransactionContextInterface, caseID string) (map[string]string, error) {
	if _, err := s.getCase(ctx, caseID); err != nil {
		return nil, err
	}

	data, err := ctx.GetStub().GetState("ORDER_" + caseID)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, fmt.Errorf("order for case %s does not exist", caseID)
	}

	var order map[string]string
	if err := json.Unmarshal(data, &order); err != nil {
		return nil, err
	}
	return order, nil
}
func (s *SmartCourtContract) RegisterDocument(ctx contractapi.TransactionContextInterface, caseID, documentHash, fileName, uploadedBy string) error {
	if caseID == "" || documentHash == "" || fileName == "" || uploadedBy == "" {
		return fmt.Errorf("all document fields are required")
	}

	if _, err := s.getCase(ctx, caseID); err != nil {
		return err
	}

	documentKey := "DOCUMENT_" + caseID + "_" + documentHash

	existing, err := ctx.GetStub().GetState(documentKey)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("document is already registered")
	}

	timestamp, err := txTime(ctx)
	if err != nil {
		return err
	}

	document := map[string]string{
		"caseId":       caseID,
		"documentHash": documentHash,
		"fileName":     fileName,
		"uploadedBy":   uploadedBy,
		"registeredAt": timestamp,
	}

	data, err := json.Marshal(document)
	if err != nil {
		return err
	}

	if err := ctx.GetStub().PutState(documentKey, data); err != nil {
		return err
	}

	return ctx.GetStub().SetEvent("DocumentRegistered", data)
}

func (s *SmartCourtContract) VerifyDocument(ctx contractapi.TransactionContextInterface, caseID, providedHash string) (bool, error) {
	documentKey := "DOCUMENT_" + caseID + "_" + providedHash

	document, err := ctx.GetStub().GetState(documentKey)
	if err != nil {
		return false, err
	}

	if document != nil {
		return true, nil
	}

	caseData, err := s.getCase(ctx, caseID)
	if err != nil {
		return false, err
	}

	return caseData.DocumentHash == providedHash, nil
}

func (s *SmartCourtContract) RecordCaseEvent(ctx contractapi.TransactionContextInterface, caseID, eventType, details, actorID string) error {
	if eventType == "" || actorID == "" {
		return fmt.Errorf("event type and actor ID are required")
	}
	if _, err := s.getCase(ctx, caseID); err != nil {
		return err
	}
	timestamp, err := txTime(ctx)
	if err != nil {
		return err
	}
	event := CaseEvent{
		EventType: eventType, Details: details,
		ActorID: actorID, Timestamp: timestamp,
	}
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	eventKey := "EVENT_" + caseID + "_" + ctx.GetStub().GetTxID()
	return ctx.GetStub().PutState(eventKey, data)
}

func (s *SmartCourtContract) GetCaseHistory(ctx contractapi.TransactionContextInterface, caseID string) ([]*CaseEvent, error) {
	if _, err := s.getCase(ctx, caseID); err != nil {
		return nil, err
	}
	prefix := "EVENT_" + caseID + "_"
	iterator, err := ctx.GetStub().GetStateByRange(prefix, prefix+"\uffff")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	history := []*CaseEvent{}
	for iterator.HasNext() {
		entry, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		event := &CaseEvent{}
		if err := json.Unmarshal(entry.Value, event); err != nil {
			return nil, fmt.Errorf("failed to decode case event %s: %v", entry.Key, err)
		}
		history = append(history, event)
	}
	return history, nil
}

func (s *SmartCourtContract) getCase(ctx contractapi.TransactionContextInterface, caseID string) (*CourtCase, error) {
	data, err := ctx.GetStub().GetState(caseID)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, fmt.Errorf("case %s does not exist", caseID)
	}
	var caseData CourtCase
	if err := json.Unmarshal(data, &caseData); err != nil {
		return nil, err
	}
	return &caseData, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartCourtContract{})
	if err != nil {
		panic(err)
	}
	if err := chaincode.Start(); err != nil {
		panic(err)
	}
}
