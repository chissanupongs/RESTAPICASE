import './App.css';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useState } from 'react';

// GraphQL Queries and Mutations
const GET_CASES = gql`
  query {
    caselist {
      token
      case_id
      case_status
      case_result
    }
  }
`;

const UPDATE_CASE_STATUS = gql`
  mutation($token: String!, $case_id: [String!]!, $case_status: String!) {
    updateCaseStatus(token: $token, case_id: $case_id, case_status: $case_status) {
      token
      case_id
      case_status
    }
  }
`;

const UPDATE_CASE_RESULT = gql`
  mutation($token: String!, $case_id: [String!]!, $case_result: String!) {
    updateCaseResult(token: $token, case_id: $case_id, case_result: $case_result) {
      token
      case_id
      case_result
    }
  }
`;

const ADD_CASE = gql`
  mutation($token: String!, $case_id: [String!]!) {
    addCase(token: $token, case_id: $case_id) {
      token
      case_id
    }
  }
`;

const DELETE_CASE = gql`
  mutation($token: String!, $case_id: [String!]!) {
    deleteCase(token: $token, case_id: $case_id) {
      token
      case_id
    }
  }
`;

function App() {
  const { loading, error, data, refetch } = useQuery(GET_CASES);
  const [updateStatus] = useMutation(UPDATE_CASE_STATUS);
  const [updateResult] = useMutation(UPDATE_CASE_RESULT);
  const [addCase] = useMutation(ADD_CASE);
  const [deleteCase] = useMutation(DELETE_CASE);

  const [token, setToken] = useState('');
  const [caseIdInput, setCaseIdInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [matchingCases, setMatchingCases] = useState([]);
  const [confirmMode, setConfirmMode] = useState(false);
  const [showAllCases, setShowAllCases] = useState(true); // ควบคุมแสดง/ซ่อน รายการเคสทั้งหมด

  const handleCheck = () => {
    if (!token || !caseIdInput) {
      alert('กรุณากรอก Token และ Case ID ก่อนตรวจสอบ');
      return;
    }
    const inputCaseIds = caseIdInput.split(',').map(id => id.trim());
    const matched = data?.caselist?.filter(
      c => c.token === token && c.case_id.some(id => inputCaseIds.includes(id))
    );
    setMatchingCases(matched || []);
    setConfirmMode(true);
  };

  const handleConfirmUpdate = async () => {
    if (!selectedStatus && !selectedResult) {
      alert('กรุณาเลือก Status หรือ Result ที่ต้องการอัปเดต');
      return;
    }

    const caseIds = caseIdInput.split(',').map(id => id.trim());

    const found = data.caselist.some(
      c => c.token === token && c.case_id.some(id => caseIds.includes(id))
    );

    try {
      if (!found) {
        await addCase({ variables: { token, case_id: caseIds } });
        console.log('✅ เพิ่มเคสใหม่เรียบร้อย');
      }

      if (selectedStatus) {
        await updateStatus({
          variables: { token, case_id: caseIds, case_status: selectedStatus }
        });
      }
      if (selectedResult) {
        await updateResult({
          variables: { token, case_id: caseIds, case_result: selectedResult }
        });
      }

      alert('✅ อัปเดตเรียบร้อย (เพิ่มเคสใหม่หากไม่มี)');
      refetch();
      resetUpdateForm();
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleDeleteCases = async () => {
    if (!window.confirm('⚠️ ต้องการลบเคสเหล่านี้จริงหรือไม่?')) return;

    const caseIds = caseIdInput.split(',').map(id => id.trim());

    try {
      await deleteCase({
        variables: { token, case_id: caseIds }
      });
      alert('✅ ลบเคสเรียบร้อยแล้ว');
      refetch();
      resetUpdateForm();
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const resetUpdateForm = () => {
    setConfirmMode(false);
    setToken('');
    setCaseIdInput('');
    setSelectedStatus('');
    setSelectedResult('');
    setMatchingCases([]);
  };

  if (loading) return <p>Loading cases...</p>;
  if (error) return <p>Error loading data.</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>🛠️ Update Case Status / Result</h2>

      <input
        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        placeholder="Token"
        value={token}
        onChange={e => setToken(e.target.value)}
      />

      <input
        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        placeholder="Case IDs (comma separated)"
        value={caseIdInput}
        onChange={e => setCaseIdInput(e.target.value)}
      />

      <button onClick={handleCheck} style={{ padding: '8px 12px', cursor: 'pointer' }}>
        🔍 ตรวจสอบก่อนอัปเดต
      </button>

      {confirmMode && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
          <h4>📝 เคสที่ตรงกับข้อมูล:</h4>
          {matchingCases.length > 0 ? (
            <table style={{ borderCollapse: 'collapse', width: '100%' }} border="1" cellPadding="6">
              <thead style={{ backgroundColor: '#f0f0f0' }}>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th>Case ID(s)</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {matchingCases.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{c.token}</td>
                    <td>{c.case_id.join(', ')}</td>
                    <td>{c.case_status || 'N/A'}</td>
                    <td>{c.case_result || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'red' }}>❌ ไม่พบเคสที่ตรงกัน (ระบบจะเพิ่มเคสใหม่ให้หากกดอัปเดต)</p>
          )}

          <div style={{ marginTop: '15px' }}>
            <label>เลือกสถานะใหม่:</label><br />
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '6px', marginTop: '4px' }}
            >
              <option value="">-- ไม่เปลี่ยน Status --</option>
              <option value="Opened">Opened</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label>เลือกผลลัพธ์ใหม่:</label><br />
            <select
              value={selectedResult}
              onChange={e => setSelectedResult(e.target.value)}
              style={{ width: '100%', padding: '6px', marginTop: '4px' }}
            >
              <option value="">-- ไม่เปลี่ยน Result --</option>
              <option value="WaitingAnalysis">WaitingAnalysis</option>
              <option value="TruePositives">TruePositives</option>
              <option value="FalsePositives">FalsePositives</option>
            </select>
          </div>

          <div style={{ marginTop: '15px' }}>
            <button
              onClick={handleConfirmUpdate}
              disabled={!selectedStatus && !selectedResult}
              style={{ padding: '8px 16px', cursor: selectedStatus || selectedResult ? 'pointer' : 'not-allowed' }}
            >
              ✅ ยืนยันการอัปเดต
            </button>{' '}
            <button onClick={resetUpdateForm} style={{ padding: '8px 16px' }}>
              ❌ ยกเลิก
            </button>{' '}
            {matchingCases.length > 0 && (
              <button
                onClick={handleDeleteCases}
                style={{ padding: '8px 16px', backgroundColor: '#e74c3c', color: 'white', marginLeft: '10px', cursor: 'pointer' }}
              >
                🗑️ ลบเคส
              </button>
            )}
          </div>
        </div>
      )}

      <hr style={{ margin: '30px 0' }} />

      <button
        onClick={() => setShowAllCases(!showAllCases)}
        style={{ padding: '8px 12px', cursor: 'pointer', marginBottom: '15px' }}
      >
        {showAllCases ? '📄 ซ่อน รายการเคสทั้งหมด' : '📄 แสดง รายการเคสทั้งหมด'}
      </button>

      {showAllCases && data && (
        <div>
          <h4>📋 รายการเคสทั้งหมด ({data.caselist.length})</h4>
          <table style={{ borderCollapse: 'collapse', width: '100%' }} border="1" cellPadding="6">
            <thead style={{ backgroundColor: '#0000FF' }}>
              <tr>
                <th>#</th>
                {/* <th>Token</th> ลบคอลัมน์นี้ออก */}
                <th>Case ID(s)</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.caselist.map((c, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {/* <td>{c.token}</td> ลบช่องนี้ออก */}
                  <td>{c.case_id.join(', ')}</td>
                  <td>{c.case_status || '-'}</td>
                  <td>{c.case_result || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
