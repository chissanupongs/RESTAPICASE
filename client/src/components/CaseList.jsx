import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_CASELIST } from "../graphql/queries";
import { DELETE_CASE } from "../graphql/mutations";
import { toast } from "react-toastify";
import Pagination from "./Pagination";

const ITEMS_PER_PAGE = 5;

const FilterIcon = ({ active }) => (
  <span style={{ cursor: "pointer", color: active ? "blue" : "gray" }}>🔍</span>
);

const CaseList = () => {
  const { data, loading, error } = useQuery(GET_CASELIST);
  const [deleteCase] = useMutation(DELETE_CASE, {
    refetchQueries: [{ query: GET_CASELIST }],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [showCaseList, setShowCaseList] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const [filterOpen, setFilterOpen] = useState({
    token: false,
    caseId: false,
    status: false,
    result: false,
    timestamp: false,
  });

  const [filters, setFilters] = useState({
    token: "",
    caseId: "",
    status: "",
    result: "",
    timestamp: "",
  });

  useEffect(() => {
    setCurrentPage(1); // reset page เมื่อ filter เปลี่ยน
  }, [filters]);

  const toggleFilter = (field) => {
    setFilterOpen((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const cases = data?.caselist || [];

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const tokenMatch = filters.token
        ? item.token.toLowerCase().includes(filters.token.toLowerCase())
        : true;

      const caseIdMatch = filters.caseId
        ? (Array.isArray(item.case_id) ? item.case_id : []).some((id) =>
            id.toLowerCase().includes(filters.caseId.toLowerCase())
          )
        : true;

      const statusMatch = filters.status
        ? (item.case_status || "").toLowerCase() === filters.status.toLowerCase()
        : true;

      const resultMatch = filters.result
        ? (item.case_result || "").toLowerCase() === filters.result.toLowerCase()
        : true;

      const timestampMatch = filters.timestamp
        ? item.timestamp && new Date(item.timestamp) >= new Date(filters.timestamp)
        : true;

      return tokenMatch && caseIdMatch && statusMatch && resultMatch && timestampMatch;
    });
  }, [cases, filters]);

  const sortedCases = useMemo(() => {
    const sorted = [...filteredCases];
    if (!sortConfig.key) return sorted;

    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key] || "";
      let bVal = b[sortConfig.key] || "";

      if (sortConfig.key === "case_id") {
        aVal = Array.isArray(a.case_id) ? a.case_id[0] : "";
        bVal = Array.isArray(b.case_id) ? b.case_id[0] : "";
      }

      if (sortConfig.key === "timestamp") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredCases, sortConfig]);

  const totalPages = Math.ceil(sortedCases.length / ITEMS_PER_PAGE);
  const displayedCases = sortedCases.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async (token, case_id) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the case: ${case_id.join(", ")} ?`
    );
    if (!confirmDelete) return;

    try {
      await deleteCase({ variables: { token, case_id } });
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error("Delete failed: " + err.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error fetching data</p>;

  return (
    <div>
      <h3>
        📋 Case List{" "}
        <button
          onClick={() => setShowCaseList((prev) => !prev)}
          style={{ marginLeft: 5, fontSize: "0.7em" }}
        >
          {showCaseList ? "HIDE_LIST" : "SHOW_LIST"}
        </button>
      </h3>

      {showCaseList && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                {["case_id", "case_status", "case_result", "timestamp"].map((key) => (
                  <th key={key} style={styles.th} onClick={() => handleSort(key)}>
                    {key.replace("_", " ").toUpperCase()}
                    {sortIndicator(key)}{" "}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFilter(key === "case_id" ? "caseId" : key.split("_")[1]);
                      }}
                    >
                      <FilterIcon
                        active={
                          filters[key === "case_id" ? "caseId" : key.split("_")[1]] !== ""
                        }
                      />
                    </span>
                  </th>
                ))}
                <th style={styles.th}>Actions</th>
              </tr>

              <tr>
                <th style={styles.filterCell}>
                  {filterOpen.caseId && (
                    <input
                      type="text"
                      placeholder="Filter Case ID"
                      value={filters.caseId}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, caseId: e.target.value }))
                      }
                      style={styles.filterInput}
                      autoFocus
                    />
                  )}
                </th>
                <th style={styles.filterCell}>
                  {filterOpen.status && (
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, status: e.target.value }))
                      }
                      style={styles.filterInput}
                      autoFocus
                    >
                      <option value="">All</option>
                      <option value="Opened">Opened</option>
                      <option value="Closed">Closed</option>
                    </select>
                  )}
                </th>
                <th style={styles.filterCell}>
                  {filterOpen.result && (
                    <select
                      value={filters.result}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, result: e.target.value }))
                      }
                      style={styles.filterInput}
                      autoFocus
                    >
                      <option value="">All</option>
                      <option value="WaitingAnalysis">WaitingAnalysis</option>
                      <option value="TruePositives">TruePositives</option>
                      <option value="FalsePositives">FalsePositives</option>
                    </select>
                  )}
                </th>
                <th style={styles.filterCell}>
                  {filterOpen.timestamp && (
                    <input
                      type="date"
                      value={filters.timestamp}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          timestamp: e.target.value,
                        }))
                      }
                      style={styles.filterInput}
                      autoFocus
                    />
                  )}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayedCases.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 10 }}>
                    ไม่มีข้อมูลที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                displayedCases.map((item, index) => (
                  <tr
                    key={item.token}
                    style={index % 2 === 0 ? styles.evenRow : styles.oddRow}
                  >
                    <td style={styles.td}>
                      {Array.isArray(item.case_id)
                        ? item.case_id.join(", ")
                        : "-"}
                    </td>
                    <td style={styles.td}>{item.case_status || "-"}</td>
                    <td style={styles.td}>{item.case_result || "-"}</td>
                    <td style={styles.td}>
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleString()
                        : "-"}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleDelete(item.token, item.case_id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  th: {
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    userSelect: "none",
    cursor: "pointer",
  },
  td: {
    padding: "6px",
    borderBottom: "1px solid #ddd",
  },
  evenRow: {
    backgroundColor: "#ffffff",
  },
  oddRow: {
    backgroundColor: "#f9f9f9",
  },
  filterInput: {
    width: "90%",
    padding: "4px 6px",
    boxSizing: "border-box",
  },
  filterCell: {
    padding: "6px",
    borderBottom: "1px solid #ddd",
    backgroundColor: "#fafafa",
    minWidth: 100,
  },
};

export default CaseList;
