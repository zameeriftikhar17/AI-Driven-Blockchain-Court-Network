#!/bin/bash
source scripts/envVar.sh
setGlobals 1
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "$ORDERER_CA" -C mychannel -n adaalatchain --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER0_ORG1_CA" --peerAddresses localhost:9051 --tlsRootCertFiles "$PEER0_ORG2_CA" -c '{"function":"ScheduleHearing","Args":["CASE-001","2026-11-15"]}'
