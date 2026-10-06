import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, Loading } from "../components/StateMessage.jsx";
import {
  createAssignment, fetchAdminAssignments, getErrorMessage, getFieldErrors, updateAssignment,
} from "../services/api.js";

const today = () => new Date().toLocaleDateString("en-CA");
const EMPTY = {
  day_number: "", title: "", description: "", difficulty: "Easy", question_link: "", assignment_date: today(),
};

function validate(f) {
  const e = {};
  if (!String(f.day_number).trim() || Number(f.day_number) < 1) e.day_number = "Enter a day number (1 or more).";
  if (!f.title.trim()) e.title = "Enter the question title.";
  if (!f.description.trim()) e.description = "Enter a short description.";
  if (!f.assignment_date) e.assignment_date = "Pick a date.";
  try {
    const u = new URL(f.question_link.trim());
    if (!["http:", "https:"].includes(u.protocol)) throw new Error();
  } catch {
    e.question_link = "Enter a valid link starting with http:// or https://";
  }
  return e;
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}

export default function AdminForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!editing) return;
    fetchAdminAssignments()
      .then((all) => {
        const a = all.find((x) => String(x.id) === id);
        if (!a) return setLoadError("That question no longer exists.");
        setForm({
          day_number: a.day_number, title: a.title, description: a.description,
          difficulty: a.difficulty, question_link: a.question_link, assignment_date: a.assignment_date,
        });
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: undefined });
    setSuccess("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    const payload = { ...form, day_number: Number(form.day_number) };
    setBusy(true);
    try {
      if (editing) {
        await updateAssignment(id, payload);
        navigate("/admin/assignments", { state: { flash: "Question updated successfully!" } });
      } else {
        await createAssignment(payload);
        setSuccess("Question added successfully!");
        // Keep day, date and difficulty so several questions for one day can be added quickly.
        setForm({ ...EMPTY, day_number: form.day_number, assignment_date: form.assignment_date });
      }
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (loadError) return <div className="admin-page"><ErrorState message={loadError} /></div>;

  return (
    <div className="admin-page narrow-form">
      <Link to="/admin/assignments" className="back">← Back to Questions</Link>
      <form className="panel" onSubmit={submit} noValidate>
        <h2>{editing ? "Edit Question" : "Add Question"}</h2>
        {success && <div className="alert alert-ok" role="status">✓ {success}</div>}
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}

        <div className="field-row">
          <Field error={errors.day_number} label="Day">
            <input type="number" min="1" placeholder="4" value={form.day_number} onChange={set("day_number")} />
          </Field>
          <Field error={errors.assignment_date} label="Date">
            <input type="date" value={form.assignment_date} onChange={set("assignment_date")} />
          </Field>
        </div>
        <Field error={errors.title} label="Question Title">
          <input type="text" maxLength={200} placeholder="Two Sum" value={form.title} onChange={set("title")} />
        </Field>
        <Field error={errors.description} label="Question Description">
          <textarea rows={4} maxLength={2000} placeholder="Given an array of integers…"
                    value={form.description} onChange={set("description")} />
        </Field>
        <div className="field-row">
          <Field error={errors.difficulty} label="Difficulty">
            <select value={form.difficulty} onChange={set("difficulty")}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </Field>
          <Field error={errors.question_link} label="Question URL">
            <input type="url" placeholder="https://leetcode.com/problems/two-sum/"
                   value={form.question_link} onChange={set("question_link")} />
          </Field>
        </div>
        <p className="muted small">
          The question appears on the student website on this date. Use today's date to show it right now, or a future date to schedule it.
        </p>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save Changes" : "Add Question"}
        </button>
        <Link to="/admin/assignments" className="btn btn-ghost btn-block form-cancel">Cancel</Link>
      </form>
    </div>
  );
}
