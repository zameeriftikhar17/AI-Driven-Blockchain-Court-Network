import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

import Home from "./pages/Home";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import CaseTracking from "./pages/CaseTracking";

import { AnimatePresence } from "framer-motion";

/* =========================================================
   CITIZEN
========================================================= */

import CitizenDashboard from "./components/dashboards/citizen/CitizenDashboard";
import FileNewCase from "./components/dashboards/citizen/FileNewCase";
import MyCases from "./components/dashboards/citizen/MyCases";
import CaseDetails from "./components/dashboards/citizen/CaseDetails";
import Notifications from "./components/dashboards/citizen/Notifications";

/* =========================================================
   LAWYER
========================================================= */

import LawyerDashboard from "./components/dashboards/lawyer/LawyerDashboard";
import LawyerAssignedCases from "./components/dashboards/lawyer/LawyerAssignedCases";
import LawyerFileNewCase from "./components/dashboards/lawyer/LawyerFileNewCase";
import LawyerViewCase from "./components/dashboards/lawyer/LawyerViewCase";
import LawyerCaseResponse from "./components/dashboards/lawyer/LawyerCaseResponse";

/* =========================================================
   JUDGE
========================================================= */

import JudgeDashboard from "./components/dashboards/judge/JudgeDashboard";
import AIAssignedCases from "./components/dashboards/judge/AIAssignedCases";
import AllCases from "./components/dashboards/judge/AllCases";
import JudgeCaseDetail from "./components/dashboards/judge/JudgeCaseDetail";
import ScheduleHearing from "./components/dashboards/judge/ScheduleHearing";
import ManageHearing from "./components/dashboards/judge/ManageHearing";

/* =========================================================
   CLERK
========================================================= */

import ClerkDashboard from "./components/dashboards/clerk/ClerkDashboard";
import RegisterCase from "./components/dashboards/clerk/RegisterCase";
import VerifyDocuments from "./components/dashboards/clerk/VerifyDocuments";

/* =========================================================
   ADMIN
========================================================= */

import AdminDashboard from "./components/dashboards/admin/AdminDashboard";
import Blockchain from "./components/dashboards/admin/Blockchain";


import JudgeManagement from "./components/dashboards/admin/JudgeManagement";
import AddJudge from "./components/dashboards/admin/AddJudge";
import EditJudge from "./components/dashboards/admin/EditJudge";

import ClerkManagement from "./components/dashboards/admin/ClerkManagement";
import AddClerk from "./components/dashboards/admin/AddClerk";
import EditClerk from "./components/dashboards/admin/EditClerk";

import AdminManagement from "./components/dashboards/admin/AdminManagement";
import AddAdmin from "./components/dashboards/admin/AddAdmin";
import EditAdmin from "./components/dashboards/admin/EditAdmin";

import CaseManagement from "./components/dashboards/admin/CaseManagement";
import ViewCase from "./components/dashboards/admin/ViewCase";
import EditCase from "./components/dashboards/admin/EditCase";
import AssignCase from "./components/dashboards/admin/AssignCase";

import UserManagement from "./components/dashboards/admin/UserManagement";
import EditUser from "./components/dashboards/admin/EditUser";
import ViewUser from "./components/dashboards/admin/ViewUser";

import AuditTrails from "./components/dashboards/admin/AuditTrails";
import AdminSettings from "./components/dashboards/admin/AdminSettings";

import LawyerManagement from "./components/dashboards/admin/LawyerManagement";
import LawyerRegistration from "./components/dashboards/admin/LawyerRegistration";

import JudgeRecommendation from "./components/dashboards/admin/JudgeRecommendation";

import AIRecommendations from "./components/dashboards/admin/AIRecommendations";
function App() {
  return (
    <HelmetProvider>

      <AuthProvider>

        <Router>

          <div className="app-container">

            {/* =====================================================
                NAVBAR
            ===================================================== */}

            <Navbar />

            {/* =====================================================
                MAIN CONTENT
            ===================================================== */}

            <main className="main-content">

              <AnimatePresence mode="wait">

                <Routes>

                  {/* =================================================
                      PUBLIC ROUTES
                  ================================================= */}

                  <Route
                    path="/"
                    element={<Home />}
                  />

                  <Route
                    path="/login"
                    element={<Login />}
                  />

                  <Route
                    path="/register"
                    element={<Register />}
                  />

                  <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                  />

                  <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                  />

                  <Route
                    path="/case-tracking"
                    element={<CaseTracking />}
                  />


                  {/* =================================================
                      CITIZEN ROUTES
                  ================================================= */}

                  <Route
                    path="/citizen-dashboard"
                    element={<CitizenDashboard />}
                  />

                  <Route
                    path="/file-new-case"
                    element={<FileNewCase />}
                  />

                  <Route
                    path="/my-cases"
                    element={<MyCases />}
                  />

                  <Route
                    path="/case-details/:id"
                    element={<CaseDetails />}
                  />

                  <Route
                    path="/notifications"
                    element={<Notifications />}
                  />


                  {/* =================================================
                      LAWYER ROUTES
                  ================================================= */}

                  <Route
                    path="/lawyer-dashboard"
                    element={<LawyerDashboard />}
                  />

                  <Route
                    path="/lawyer/dashboard"
                    element={<LawyerDashboard />}
                  />

                  <Route
                    path="/lawyer/assigned-cases"
                    element={<LawyerAssignedCases />}
                  />

                  <Route
                    path="/lawyer/file-case"
                    element={<LawyerFileNewCase />}
                  />

<Route
  path="/lawyer/case-tracking/:id"
  element={<LawyerViewCase />}
/>
<Route
  path="/lawyer/case-response/:id"
  element={<LawyerCaseResponse />}
/>
                  {/* =================================================
                      JUDGE DASHBOARD
                  ================================================= */}

                  <Route
                    path="/judge-dashboard"
                    element={<JudgeDashboard />}
                  />


                  {/* =================================================
                      JUDGE - ALL CASES
                      
                      Both URLs supported:
                      
                      /judge-dashboard/cases
                      /judge-dashboard/all-cases
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/cases"
                    element={<AllCases />}
                  />

                  <Route
                    path="/judge-dashboard/all-cases"
                    element={<AllCases />}
                  />


                  {/* =================================================
                      JUDGE - AI ASSIGNED CASES
                      
                      Both URLs supported:
                      
                      /judge-dashboard/ai-assigned
                      /judge-dashboard/ai-assigned-cases
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/ai-assigned"
                    element={<AIAssignedCases />}
                  />

                  <Route
                    path="/judge-dashboard/ai-assigned-cases"
                    element={<AIAssignedCases />}
                  />


                  {/* =================================================
                      JUDGE - CASE DETAIL
                      
                      IMPORTANT:
                      View Case button opens this page.
                      
                      URL:
                      /judge-dashboard/case/:id
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/case/:id"
                    element={<JudgeCaseDetail />}
                  />


                  {/* =================================================
                      JUDGE - SCHEDULE HEARING
                      
                      Both URLs supported.
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/schedule"
                    element={<ScheduleHearing />}
                  />

                  <Route
                    path="/judge-dashboard/schedule-hearing"
                    element={<ScheduleHearing />}
                  />


                  {/* =================================================
                      JUDGE - MANAGE HEARING
                      
                      Main route:
                      /judge-dashboard/hearing/:id
                      
                      Extra compatibility routes also supported.
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/hearing/:id"
                    element={<ManageHearing />}
                  />

                  <Route
                    path="/judge-dashboard/manage-hearing/:id"
                    element={<ManageHearing />}
                  />

                  <Route
                    path="/judge/manage-hearing/:id"
                    element={<ManageHearing />}
                  />


                  {/* =================================================
                      JUDGE - PENDING
                      
                      Dashboard itself can handle pending cases.
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/pending"
                    element={<JudgeDashboard />}
                  />


                  {/* =================================================
                      JUDGE - COMPLETED
                      
                      Dashboard itself can handle completed cases.
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/completed"
                    element={<JudgeDashboard />}
                  />


                  {/* =================================================
                      JUDGE - NOTIFICATIONS
                  ================================================= */}

                  <Route
                    path="/judge-dashboard/notifications"
                    element={<Notifications />}
                  />


                  {/* =================================================
                      CLERK
                  ================================================= */}

                  <Route
                    path="/clerk-dashboard"
                    element={<ClerkDashboard />}
                  />

                  <Route
                    path="/clerk-dashboard/register-case"
                    element={<RegisterCase />}
                  />

                  <Route
                    path="/clerk-dashboard/verify-documents"
                    element={<VerifyDocuments />}
                  />


                  {/* =================================================
                      ADMIN DASHBOARD
                  ================================================= */}

                  <Route
                    path="/admin-dashboard"
                    element={<AdminDashboard />}
                  />
<Route
  path="/admin-dashboard/blockchain"
  element={<Blockchain />}
/>

<Route
  path="/admin-dashboard/ai-recommendations"
  element={<AIRecommendations />}
/>

                  {/* =================================================
                      ADMIN - JUDGES
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/judges"
                    element={<JudgeManagement />}
                  />

                  <Route
                    path="/admin-dashboard/judges/add"
                    element={<AddJudge />}
                  />

                  <Route
                    path="/admin-dashboard/judges/edit/:id"
                    element={<EditJudge />}
                  />


                  {/* =================================================
                      ADMIN - CLERKS
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/clerks"
                    element={<ClerkManagement />}
                  />

                  <Route
                    path="/admin-dashboard/clerks/add"
                    element={<AddClerk />}
                  />

                  <Route
                    path="/admin-dashboard/clerks/edit/:id"
                    element={<EditClerk />}
                  />


                  {/* =================================================
                      ADMIN - ADMINS
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/admins"
                    element={<AdminManagement />}
                  />

                  <Route
                    path="/admin-dashboard/admins/add"
                    element={<AddAdmin />}
                  />

                  <Route
                    path="/admin-dashboard/admins/edit/:id"
                    element={<EditAdmin />}
                  />


                  {/* =================================================
                      ADMIN - CASE MANAGEMENT
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/cases"
                    element={<CaseManagement />}
                  />

                  <Route
                    path="/admin-dashboard/cases/view/:id"
                    element={<ViewCase />}
                  />

                  <Route
                    path="/admin-dashboard/cases/edit/:id"
                    element={<EditCase />}
                  />

                  <Route
                    path="/admin-dashboard/cases/assign/:id"
                    element={<AssignCase />}
                  />

                  <Route
                    path="/admin-dashboard/cases/recommend-judge/:id"
                    element={<JudgeRecommendation />}
                  />


                  {/* =================================================
                      ADMIN - USERS
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/users"
                    element={<UserManagement />}
                  />

                  <Route
                    path="/admin-dashboard/users/edit/:id"
                    element={<EditUser />}
                  />

                  <Route
                    path="/admin-dashboard/users/view/:id"
                    element={<ViewUser />}
                  />


                  {/* =================================================
                      ADMIN - AUDIT
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/audit"
                    element={<AuditTrails />}
                  />


                  {/* =================================================
                      ADMIN - SETTINGS
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/settings"
                    element={<AdminSettings />}
                  />


                  {/* =================================================
                      ADMIN - LAWYERS
                  ================================================= */}

                  <Route
                    path="/admin-dashboard/lawyers"
                    element={<LawyerManagement />}
                  />

                  <Route
                    path="/admin-dashboard/lawyer-registration"
                    element={<LawyerRegistration />}
                  />

                  <Route
                    path="/admin-dashboard/lawyer-registration/:id"
                    element={<LawyerRegistration />}
                  />


                  {/* =================================================
                      FALLBACK
                      
                      Agar koi unknown URL ho to Home.
                  ================================================= */}

                  <Route
                    path="*"
                    element={
                      <Navigate
                        to="/"
                        replace
                      />
                    }
                  />

                </Routes>

              </AnimatePresence>

            </main>


            {/* =====================================================
                FOOTER
            ===================================================== */}

            <Footer />

          </div>

        </Router>

      </AuthProvider>

    </HelmetProvider>
  );
}


export default App;