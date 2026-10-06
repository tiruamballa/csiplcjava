import { Link } from "react-router-dom";
import TodayAssignments from "../components/TodayAssignments.jsx";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1>Java for Problem Solving Skills</h1>
            <p className="hero-tag">
              Strengthen your Java fundamentals<br />and build your problem-solving skills.
            </p>
            <div className="hero-actions">
              <a href="#today" className="btn btn-primary">Today's Assignments</a>
              <Link to="/previous" className="btn btn-light">Previous Assignments</Link>
            </div>
          </div>
          <div className="hero-logo-wrap" aria-label="CSI logo">
            <img
              src="/csi-logo.png"
              alt="CSI logo"
              className="hero-logo"
            />
          </div>
        </div>
      </section>
      <TodayAssignments />
    </>
  );
}