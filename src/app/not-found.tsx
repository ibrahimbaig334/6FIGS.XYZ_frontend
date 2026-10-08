import Link from "next/link";
import { BrandChop } from "../components/Chop";

export default function NotFound() {
  return (
    <section
      style={{
        padding: "2rem 5vw",
        flex: 1,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div className="plate gate-card">
        <BrandChop size="lg" />
        <h1 className="label">No table here</h1>
        <p className="fine">
          There is no room behind this door. The floor is that way.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to the room
        </Link>
      </div>
    </section>
  );
}
