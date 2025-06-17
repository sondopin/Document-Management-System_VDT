import React, { useState, useRef, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import Filter from "./Filter";
import { useFolder } from "../context/folder.context";
import { useNavigate } from "react-router-dom";

const SearchBar: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchQuery, setSearchQuery, parentFolder } = useFolder();
  const navigate = useNavigate();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    console.log("Search query submitted:", searchQuery);
    if (parentFolder) {
      // Nếu đang ở trong một thư mục cụ thể, chuyển hướng đến trang tìm kiếm trong thư mục đó
      navigate(`/drive/folders/${parentFolder}`);
    } else {
      // Nếu không, chuyển hướng đến trang tìm kiếm chung
      navigate("/drive/my-drive");
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Toàn bộ phần hộp mở rộng */}
      <form
        // onSubmit={handleSubmit}
        className={`flex flex-col gap-3 bg-white border rounded-2xl px-4 py-3 shadow  transition-all duration-300 ${showDropdown ? "mt-2" : "bg-gray-100 px-3 py-2 flex-row rounded-full"
          }`}
      >
        {/* Thanh tìm kiếm chính */}
        <div className="flex items-center gap-2">
          <FiSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Tìm trong Drive"
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => setSearchQuery({ ...searchQuery, search_content: e.target.value })}
            className={`w-full bg-transparent text-black focus:outline-none text-xl`}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
          />
        </div>

        {/* Nếu dropdown được mở thì hiển thị bộ lọc + gợi ý */}
        {showDropdown && (
          <Filter />
        )}
      </form>
    </div>
  );
};

export default SearchBar;
