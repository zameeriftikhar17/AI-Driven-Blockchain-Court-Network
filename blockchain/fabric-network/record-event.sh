#!/bin/bash
source scripts/envVar.sh
setGlobals 1
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" -C mychannel -n adaalatchain --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER0_ORG1_CA" --peerAddresses localhost:9051 --tlsRootCertFiles "$PEER0_ORG2_CA" -c '{"function":"RecordCaseEvent","Args":["CASE-001","HEARING_SCHEDULED","Hearing scheduled for 2026-11-20","JUDGE-001"]}'
