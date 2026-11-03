import { Navigate, Route, Routes } from "react-router-dom";
import { AppointmentsDayPage } from "./AppointmentsPage";
import AppointmentDetailPage from "./AppointmentDetailPage";
import AppointmentsPageWeb from "./AppointmentsPage.web";
import { withWeb } from "../../../components/web/withWeb";

// Website viewport v1 (WB-ST-AP, .1): from 1024px wide the day and an
// appointment are one list-detail page at /app/business/appointments
// (BusinessOperationsTab sends an Appointments business there on web).
const AppointmentsIndex = withWeb(() => <Navigate to="/app/business/operations" replace />, AppointmentsPageWeb);
const AppointmentRoute = withWeb(AppointmentDetailPage, AppointmentsPageWeb);

// v6 Batch 4 · /app/business/appointments/* (one App.tsx line). The
// Appointments tab root is /app/business/operations for an appointments-only
// Wellness Service (BusinessOperationsTab), or the Orders tab's fourth tab.
// The services set-up page is /app/business/services (a More page, V6-158).

export default function BusinessAppointmentsRoutes() {
  return (
    <Routes>
      <Route index element={<AppointmentsIndex />} />
      <Route path="day" element={<AppointmentsDayPage />} />
      <Route path=":appointmentId" element={<AppointmentRoute />} />
    </Routes>
  );
}
