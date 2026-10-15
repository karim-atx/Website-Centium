import { Navigate, Route, Routes } from "react-router-dom";
import { FormsHome, FORMS_PATH } from "../../../components/pro/forms/FormsHome";
import { FormBuilder } from "../../../components/pro/forms/FormBuilder";
import { ResponseScreen } from "../../../components/pro/forms/ResponseScreen";

/**
 * Release 3 · Forms and check-ins (/app/more/forms/*, MO29, HO20, CL10):
 * - /app/more/forms: the Intake and Check-ins lists with the lane templates;
 * - /app/more/forms/new/intake | new/check-in: a new form in the builder;
 * - /app/more/forms/:formId: the builder (questions, Sending / Schedule);
 * - /app/more/forms/responses/:responseId: a submitted response (HO20
 *   Check-in review for a check-in, CL10 Intake answers for an intake).
 */
export default function Forms() {
  return (
    <Routes>
      <Route index element={<FormsHome />} />
      <Route path="new/:kind" element={<FormBuilder />} />
      <Route path="responses/:responseId" element={<ResponseScreen />} />
      <Route path=":formId" element={<FormBuilder />} />
      <Route path="*" element={<Navigate to={FORMS_PATH} replace />} />
    </Routes>
  );
}
