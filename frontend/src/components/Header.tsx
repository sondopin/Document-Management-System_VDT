import { NavLink } from "react-router-dom";
import { Fragment, useContext } from "react";
import { AppContext } from "../context/app.context";
import { Dropdown } from "antd";
import { logout } from "../apis/auth.api";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "../apis/user.api";
import SearchBar from "./SearchBar";

// Header component displays the navigation bar with dynamic links based on the user's authentication status and role (Admin or User).
const Header = () => {

    const { isAuthenticated, setIsAuthenticated } = useContext(AppContext);
    // Fetch current user data when authenticated using React Query.
    const { data: user } = useQuery({
        queryKey: [isAuthenticated],
        queryFn: () => fetchCurrentUser(),
        enabled: isAuthenticated,
        staleTime: 1000 * 15,
    });

    // Menu items for the user's dropdown after authentication.
    const menuItems = [
        {
            key: "1",
            label: (
                <NavLink className="font-semibold h-6 flex items-center text-base" to="/user-profile">
                    <img src="/my_account.png" className="h-6 mr-2" /> My Account
                </NavLink>
            ),
        },
        {
            key: "2",
            label: (
                <NavLink
                    to="/"
                    className="mt-5px h-6 flex items-center font-semibold text-base bg-white"
                    onClick={() => {
                        logout();
                        localStorage.removeItem('breadcrumbs');
                        setIsAuthenticated(false);
                    }}
                >
                    <img src="/log_out.png" className="h-6 mr-2" /> Sign Out
                </NavLink>
            ),
        },
    ];

    return (
        <div className="flex justify-between h-15 md:gap-[10px] gap-[10px] md:flex-row bg-gray-50 items-center px-[10px] py-[5px]">
            <NavLink className="flex items-center w-1/7" to="/drive/my-drive" state={{ option: "owner" }}>
                <img
                    src="/logo.png"
                    className="h-[60px]"
                />
                <p className="text-black text-[16px] font-semibold">VDT Drive</p>
            </NavLink>

            <div className="bg-gray-100 h-10 w-1/2 rounded-2xl">
                {/* Search bar can be implemented here */}
                <SearchBar />
            </div>

            {/* User's profile or login/register options */}
            <div className="flex ml-10 space-x-2 w-1/5 md:space-x-4 md:w-[200px]">
                {isAuthenticated ? (
                    // Show profile dropdown if authenticated
                    <Dropdown menu={{ items: menuItems }}>
                        <div className="flex flex-row items-center">
                            <img
                                src="/account.png"
                                className="w-8 h-6 text-2xl cursor-pointer md:w-12 md:h-8 min-w-8"
                            />
                            <div className="text-black text-[16px] font-semibold">
                                {user?.user_name}
                            </div>
                        </div>
                    </Dropdown>
                ) : (
                    <Fragment>
                        {/* Show login and register links if not authenticated */}
                        <NavLink
                            to="/login"
                            className="text-[14px] font-bold text-black my-auto transition-transform duration-200 ease-in-out hover:scale-[1.2] md:text-[18px]"
                        >
                            Login
                        </NavLink>
                        <NavLink
                            to="/register"
                            className="text-[14px] font-bold text-black my-auto transition-transform duration-200 ease-in-out hover:scale-[1.2] md:text-[18px]"
                        >
                            Register
                        </NavLink>
                    </Fragment>
                )}
            </div>
        </div>
    );
};

export default Header;
