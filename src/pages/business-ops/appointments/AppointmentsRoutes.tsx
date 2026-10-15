import { Navigate, Route, Routes } from "react-router-dom";
import { AppointmentsDayPage } from "./AppointmentsPage";
import AppointmentDetailPage from "./AppointmentDetailPage";

// v6 Batch 4 · /app/business/appointments/* (one App.tsx line). The
// Appointments tab root is /app/business/operations for an appointments-only
// Wellness Service (BusinessOperationsTab), or the Orders tab's fourth tab.
// The services set-up page is /app/business/services (a More page, V6-158).

export default function BusinessAppointmentsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/app/business/operations" replace />} />
      <Route path="day" element={<AppointmentsDayPage />} />
      <Route path=":appointmentId" element={<AppointmentDetailPage />} />
    </Routes>
  );
}
