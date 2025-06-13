import React, { useState, useRef, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";



const SearchBar: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ type: "", user: "", modified: "" });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Toàn bộ phần hộp mở rộng */}
      <form
        // onSubmit={handleSubmit}
        className={`flex flex-col gap-3 bg-white border rounded-2xl px-4 py-3 shadow  transition-all duration-300 ${
          showDropdown ? "mt-2" : "bg-gray-100 px-3 py-2 flex-row rounded-full"
        }`}
      >
        {/* Thanh tìm kiếm chính */}
        <div className="flex items-center gap-2">
          <FiSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Tìm trong Drive"
            value={query}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full bg-transparent text-black focus:outline-none text-xl`}
            // onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
          />
        </div>

        {/* Nếu dropdown được mở thì hiển thị bộ lọc + gợi ý */}
        {showDropdown && (
          <>
            {/* Bộ lọc */}
            <div className="flex gap-2 rounded-2xl">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Loại</option>
                <option value="pdf">PDF</option>
                <option value="doc">DOC</option>
                <option value="folder">Thư mục</option>
              </select>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              >
                <option value="">Người</option>
                <option value="me">Tôi</option>
                <option value="others">Người khác</option>
              </select>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={filters.modified}
                onChange={(e) => setFilters({ ...filters, modified: e.target.value })}
              >
                <option value="">Lần sửa đổi gần đây</option>
                <option value="today">Hôm nay</option>
                <option value="thisWeek">Tuần này</option>
                <option value="thisMonth">Tháng này</option>
              </select>
            </div>

            {/* Gợi ý */}
            <ul>
              
            </ul>
          </>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
