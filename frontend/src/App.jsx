import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Assignments from "./pages/Assignments.jsx";
import Previous from "./pages/Previous.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminManage from "./pages/AdminManage.jsx";
import AdminForm from "./pages/AdminForm.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import AdminStudents from "./pages/AdminStudents.jsx";
import AdminAttendance from "./pages/AdminAttendance.jsx";
import AdminReport from "./pages/AdminReport.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public - no login */}
        <Route path="/" element={<Home />} />
        <Route path="/today" element={<Assignments />} />
        <Route path="/previous" element={<Previous />} />
        <Route path="/previous/:day" element={<Previous />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/assignments" element={<AdminManage />} />
            <Route path="/admin/assignments/new" element={<AdminForm />} />
            <Route path="/admin/assignments/:id/edit" element={<AdminForm />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/attendance" element={<AdminAttendance />} />
            <Route path="/admin/report" element={<AdminReport />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
