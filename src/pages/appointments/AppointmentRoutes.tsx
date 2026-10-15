import { Route, Routes } from "react-router-dom";
import BookAppointmentPage from "./BookAppointmentPage";
import MyAppointmentsPage, { MyAppointmentPage } from "./MyAppointmentsPage";

// V6-49 · the customer side of appointments, /app/appointments/* (one App.tsx line).
export default function AppointmentRoutes() {
  return (
    <Routes>
      <Route index element={<MyAppointmentsPage />} />
      <Route path="book/:businessId" element={<BookAppointmentPage />} />
      <Route path=":appointmentId" element={<MyAppointmentPage />} />
    </Routes>
  );
}
