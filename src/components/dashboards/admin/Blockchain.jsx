
import React, { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from "../../../firebase";
import {
  FaDatabase,
  FaSearch,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

const Blockchain = () => {
  const [cases, setCases] = useState([]);
  const [blockchainRecords, setBlockchainRecords] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [caseHistories, setCaseHistories] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});
  const [expandedCase, setExpandedCase] = useState(null);

  // Document verification states
  const [documentVerifications, setDocumentVerifications] = useState({});
  const [verificationLoading, setVerificationLoading] = useState({});

  // MANUAL DOCUMENT VERIFICATION
 const verifyDocument = async (
  caseId,
  updatedHash
) => {
  if (!updatedHash) {
      setDocumentVerifications(prev => ({
        ...prev,
        [caseId]: 'NO_HASH'
      }));
      return;
    }

    setVerificationLoading(prev => ({
      ...prev,
      [caseId]: true
    }));

    setDocumentVerifications(prev => ({
      ...prev,
      [caseId]: 'VERIFYING'
    }));

    try {
      const response = await fetch(
        'http://localhost:8000/blockchain/verify-document',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
  caseId: caseId,
  updatedDocumentHash: updatedHash,
  actorId: 'Admin Dashboard'
})
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail || `Verification API error: ${response.status}`
        );
      }

      const isAuthentic =
        result === true ||
        result?.isAuthentic === true ||
        result?.authentic === true;

      setDocumentVerifications(prev => ({
        ...prev,
        [caseId]: isAuthentic ? 'AUTHENTIC' : 'NOT_AUTHENTIC'
      }));

      // Refresh history if it is already open
      if (expandedCase === caseId) {
        await loadCaseHistory(caseId);
      }

    } catch (error) {
      console.error('Document verification error:', error);

      setDocumentVerifications(prev => ({
        ...prev,
        [caseId]: 'ERROR'
      }));

    } finally {
      setVerificationLoading(prev => ({
        ...prev,
        [caseId]: false
      }));
    }
  };

  // LOAD CASES AND BLOCKCHAIN RECORDS
  useEffect(() => {
    const casesRef = ref(db, 'cases');

    onValue(casesRef, async (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setCases([]);
        setBlockchainRecords({});
        setLoading(false);
        return;
      }

      const caseList = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));

      setCases(caseList);

      const records = {};

      await Promise.all(
        caseList.map(async (item) => {
          try {
            const response = await fetch(
              `http://localhost:8000/blockchain/case/${encodeURIComponent(item.id)}`
            );

            if (response.ok) {
              records[item.id] = await response.json();
            }
          } catch (error) {
            console.error('Blockchain fetch error:', item.id, error);
          }
        })
      );

      setBlockchainRecords(records);
      setLoading(false);
    });

    return () => {
      off(casesRef);
    };
  }, []);

  // LOAD BLOCKCHAIN CASE HISTORY
  const loadCaseHistory = async (caseId) => {
    setHistoryLoading(prev => ({
      ...prev,
      [caseId]: true
    }));

    try {
      const response = await fetch(
        `http://localhost:8000/blockchain/case-history/${encodeURIComponent(caseId)}`
      );

      if (!response.ok) {
        throw new Error(`History API error: ${response.status}`);
      }

      const result = await response.json();

      setCaseHistories(prev => ({
        ...prev,
        [caseId]: Array.isArray(result)
          ? result
          : result.value || []
      }));

    } catch (error) {
      console.error('History error for case:', caseId, error);

      setCaseHistories(prev => ({
        ...prev,
        [caseId]: []
      }));

    } finally {
      setHistoryLoading(prev => ({
        ...prev,
        [caseId]: false
      }));
    }
  };

  // TOGGLE BLOCKCHAIN HISTORY
  const toggleHistory = (caseId) => {
    if (expandedCase === caseId) {
      setExpandedCase(null);
      return;
    }

    setExpandedCase(caseId);

    if (!Object.prototype.hasOwnProperty.call(caseHistories, caseId)) {
      loadCaseHistory(caseId);
    }
  };

  const filteredCases = cases.filter(item =>
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  const registeredCount = Object.values(blockchainRecords).filter(
    item => String(item.status || '').toUpperCase() !== 'NOT_REGISTERED'
  ).length;

  const verifiedCount = Object.values(documentVerifications).filter(
    status => status === 'AUTHENTIC'
  ).length;

  return (
    <div style={{
      padding: '30px',
      minHeight: '100vh',
      background: '#F1F5F9'
    }}>

      <h1 style={{ color: '#1E293B' }}>
        <FaDatabase /> Blockchain Monitoring
      </h1>

      <p style={{ color: '#64748B' }}>
        Monitor court case records stored on Hyperledger Fabric.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        margin: '25px 0'
      }}>

        <div style={cardStyle}>
          <FaDatabase color="#0288D1" size={25} />
          <h2>{cases.length}</h2>
          <p>Total Cases</p>
        </div>

        <div style={cardStyle}>
          <FaShieldAlt color="#7C3AED" size={25} />
          <h2>{registeredCount}</h2>
          <p>Blockchain Records Found</p>
        </div>

        <div style={cardStyle}>
          <FaCheckCircle color="#16A34A" size={25} />
          <h2>{verifiedCount}</h2>
          <p>Verified Cases</p>
        </div>

      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px'
      }}>

        <h2>Blockchain Case Records</h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '20px 0'
        }}>
          <FaSearch />

          <input
            type="text"
            placeholder="Search by Case ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '12px',
              width: '100%',
              border: '1px solid #CBD5E1',
              borderRadius: '8px'
            }}
          />
        </div>

        {loading ? (
          <p>Loading blockchain records...</p>
        ) : filteredCases.length === 0 ? (
          <p>No cases found.</p>
        ) : (
          filteredCases.map(item => {
            const record = blockchainRecords[item.id];

            return (
              <div
                key={item.id}
                style={{
                  padding: '18px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  marginBottom: '15px'
                }}
              >

                <h3>{item.title || 'Untitled Case'}</h3>

                <p>
                  <strong>Case ID:</strong> {item.id}
                </p>

                <p>
                  <strong>Case Type:</strong>{' '}
                  {item.predictedCaseType || item.caseType || 'N/A'}
                </p>

                <p>
                  <strong>Blockchain Status:</strong>{' '}
                  {record &&
                  String(record.status || '').toUpperCase() !== 'NOT_REGISTERED' ? (
                    <span style={{ color: '#16A34A' }}>
                      <FaCheckCircle /> {record.status || 'Registered'}
                    </span>
                  ) : (
                    <span style={{ color: '#D97706' }}>
                      <FaExclamationTriangle /> Record Not Found
                    </span>
                  )}
                </p>

                {record &&
                String(record.status || '').toUpperCase() !== 'NOT_REGISTERED' && (
                  <>
                    <p>
  <strong>Original Blockchain Hash:</strong>
  <br />
  <small style={{ wordBreak: 'break-all' }}>
    {record?.documentHash || 'N/A'}
  </small>
</p>

                   
<p>
  <strong>Current Database Hash (Firebase):</strong>
  <br />
  <small style={{ wordBreak: 'break-all' }}>
    {item.updatedDocumentHash || item.documentHash || 'N/A'}
  </small>
</p>


                    <p>
                      <strong>Assigned Judge:</strong>{' '}
                      {record.assignedJudge || 'Not Assigned'}
                    </p>

                    <p>
                      <strong>Hearing Date:</strong>{' '}
                      {record.hearingDate || 'Not Scheduled'}
                    </p>

                    <p>
                      <strong>Created At:</strong>{' '}
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleString()
                        : 'N/A'}
                    </p>
                  </>
                )}

                {/* DOCUMENT VERIFICATION RESULT */}
                <p>
                  <strong>Document Verification:</strong>{' '}

                  {documentVerifications[item.id] === 'AUTHENTIC' ? (
                    <span style={{
                      color: '#16A34A',
                      fontWeight: 'bold'
                    }}>
                      <FaCheckCircle /> Case is Authentic
                    </span>
                  ) : documentVerifications[item.id] === 'NOT_AUTHENTIC' ? (
                    <span style={{
                      color: '#DC2626',
                      fontWeight: 'bold'
                    }}>
                      <FaExclamationTriangle /> Document Not Authentic
                    </span>
                  ) : documentVerifications[item.id] === 'VERIFYING' ? (
                    <span style={{ color: '#D97706' }}>
                      Verifying Document...
                    </span>
                  ) : documentVerifications[item.id] === 'NO_HASH' ? (
                    <span style={{ color: '#DC2626' }}>
                      Firebase document hash not found
                    </span>
                  ) : documentVerifications[item.id] === 'ERROR' ? (
                    <span style={{ color: '#DC2626' }}>
                      Verification Failed
                    </span>
                  ) : (
                    <span style={{ color: '#64748B' }}>
                      Not Verified Yet
                    </span>
                  )}
                </p>

               
{/* MANUAL VERIFY BUTTON */}
<button
 onClick={() => verifyDocument(
  item.id,
  item.updatedDocumentHash || item.documentHash
)}
  disabled={verificationLoading[item.id] || !record?.documentHash}
  style={{
    background: '#16A34A',
    color: 'white',
    border: 'none',
    padding: '9px 14px',
    borderRadius: '7px',
    cursor: verificationLoading[item.id] || !record?.documentHash
      ? 'not-allowed'
      : 'pointer',
    marginBottom: '12px'
  }}
>
  {verificationLoading[item.id]
    ? 'Verifying...'
    : 'Verify Document'}
</button>


                {/* BLOCKCHAIN HISTORY BUTTON */}
                <button
                  onClick={() => toggleHistory(item.id)}
                  style={{
                    background: '#1D4ED8',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    marginLeft: '8px'
                  }}
                >
                  {expandedCase === item.id
                    ? 'Hide Blockchain History'
                    : 'View Blockchain History'}
                </button>

                {expandedCase === item.id && (
                  <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    background: '#F8FAFC',
                    borderRadius: '8px'
                  }}>
                    <h4>Blockchain Case History</h4>

                    {historyLoading[item.id] ? (
                      <p>Loading history...</p>
                    ) : !caseHistories[item.id]?.length ? (
                      <p>No blockchain history available.</p>
                    ) : (
                      caseHistories[item.id].map((event, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '12px',
                            marginBottom: '10px',
                            background: 'white',
                            borderLeft: '4px solid #0288D1',
                            borderRadius: '6px'
                          }}
                        >
                          <strong>{event.eventType}</strong>
                          <p>{event.details}</p>
                          <p>Actor: {event.actorId}</p>
                          <small>
                            {event.timestamp
                              ? new Date(event.timestamp).toLocaleString()
                              : 'Date unavailable'}
                          </small>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}

      </div>
    </div>
  );
};

const cardStyle = {
  background: 'white',
  padding: '22px',
  borderRadius: '12px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
};

export default Blockchain;
