import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  ADD_CASE,
  UPDATE_CASE_STATUS,
  UPDATE_CASE_RESULT,
} from '../graphql/mutations';
import { GET_CASELIST } from '../graphql/queries';
import { toast } from 'react-toastify';

export default function CaseForm() {
  const [token, setToken] = useState('');
  const [caseIds, setCaseIds] = useState('');
  const [caseStatus, setCaseStatus] = useState('');
  const [caseResult, setCaseResult] = useState('');

  const [matchedCases, setMatchedCases] = useState([]);

  const { data, loading, error } = useQuery(GET_CASELIST);

  const [addCase] = useMutation(ADD_CASE, {
    refetchQueries: [{ query: GET_CASELIST }],
    onCompleted: () => toast.success('✅ Added case(s) successfully'),
    onError: (err) => toast.error('❌ Failed to add case(s): ' + err.message),
  });

  const [updateStatus] = useMutation(UPDATE_CASE_STATUS, {
    refetchQueries: [{ query: GET_CASELIST }],
    onCompleted: () => toast.success('✅ Updated status successfully'),
    onError: (err) => toast.error('❌ Failed to update status: ' + err.message),
  });

  const [updateResult] = useMutation(UPDATE_CASE_RESULT, {
    refetchQueries: [{ query: GET_CASELIST }],
    onCompleted: () => toast.success('✅ Updated result successfully'),
    onError: (err) => toast.error('❌ Failed to update result: ' + err.message),
  });

  const parseCaseIds = () =>
    caseIds.split(',').map(s => s.trim()).filter(Boolean);

  // useEffect คอยตรวจจับ token หรือ caseIds เปลี่ยนเพื่อ filter เคสอัตโนมัติ
  useEffect(() => {
    if (loading || error) {
      setMatchedCases([]);
      return;
    }
    if (!token.trim() || !caseIds.trim()) {
      setMatchedCases([]);
      return;
    }
    if (!data || !data.caselist) {
      setMatchedCases([]);
      return;
    }

    const caseIdArray = parseCaseIds();

    const matched = data.caselist.filter(
      c =>
        c.token === token &&
        c.case_id.some(id => caseIdArray.includes(id))
    );

    setMatchedCases(matched);
  }, [token, caseIds, data, loading, error]);

  // ฟังก์ชันยืนยันอัปเดตเคสจริงๆ
  const onUpdate = async () => {
    if (!token.trim() || !caseIds.trim()) {
      toast.error('🔴 Please enter token and case ID(s)');
      return;
    }
    if (!caseStatus && !caseResult) {
      toast.error('🔴 Please select status or result to update');
      return;
    }

    const caseIdArray = parseCaseIds();

    try {
      if (matchedCases.length === 0) {
        // เพิ่มเคสใหม่ ถ้าไม่เจอเคสตรงกัน
        await addCase({ variables: { token, case_id: caseIdArray } });
      }

      if (caseStatus) {
        await updateStatus({ variables: { token, case_id: caseIdArray, case_status: caseStatus } });
      }
      if (caseResult) {
        await updateResult({ variables: { token, case_id: caseIdArray, case_result: caseResult } });
      }

      toast.success('✅ Case updated successfully');

      // reset form และ matched cases
      setToken('');
      setCaseIds('');
      setCaseStatus('');
      setCaseResult('');
      setMatchedCases([]);
    } catch {
      // error จัดการใน onError ของ mutation
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <h3>📋 Manage Cases</h3>

      <div className="form-group">
        <label>🔑 Token:</label>
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Enter token"
        />
      </div>

      <div className="form-group">
        <label>🆔 Case ID (comma separated):</label>
        <input
          type="text"
          list="caseIdSuggestions"
          value={caseIds}
          onChange={e => setCaseIds(e.target.value)}
          placeholder="e.g. case1, case2"
        />
        <datalist id="caseIdSuggestions">
          {data?.caselist
            ?.filter(c => c.token === token)
            .flatMap(c => c.case_id)
            .filter((id, index, self) => id && self.indexOf(id) === index)
            .map((id, index) => (
              <option key={index} value={id} />
            ))}
        </datalist>
      </div>

      <div className="form-group">
        <label>📌 Status:</label>
        <select
          value={caseStatus}
          onChange={e => setCaseStatus(e.target.value)}
        >
          <option value="">-- Select Status --</option>
          <option value="Opened">Opened</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="form-group">
        <label>📊 Result:</label>
        <select
          value={caseResult}
          onChange={e => setCaseResult(e.target.value)}
        >
          <option value="">-- Select Result --</option>
          <option value="WaitingAnalysis">WaitingAnalysis</option>
          <option value="TruePositives">TruePositives</option>
          <option value="FalsePositives">FalsePositives</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button onClick={onUpdate}>🛠️ Update Case</button>
      </div>

      {token.trim() && caseIds.trim() && (
        <div style={{ marginTop: 20, border: '1px solid #ccc', padding: 15 }}>
          <h4>📋 Matched Cases</h4>
          {loading ? (
            <p>⏳ Loading cases...</p>
          ) : error ? (
            <p style={{ color: 'red' }}>❌ Error loading cases</p>
          ) : matchedCases.length > 0 ? (
            <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th>#</th>
                  <th>Token</th>
                  <th>Case IDs</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {matchedCases.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{c.token}</td>
                    <td>{c.case_id.join(', ')}</td>
                    <td>{c.case_status || '-'}</td>
                    <td>{c.case_result || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>⚠️ No matched cases found. A new case will be added upon update.</p>
          )}
        </div>
      )}
    </div>
  );
}
