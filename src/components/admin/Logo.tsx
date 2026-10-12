// Login and create-first-user screens. White mark and wordmark, floating on the dark admin canvas.
export function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img src="/assets/solutiq-logo-white.svg" alt="" style={{ display: "block", height: 40 }} />
      <span
        style={{
          fontFamily: "Ubuntu, sans-serif",
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: "0.2em",
          color: "#FFFFFF",
        }}
      >
        SOLUTIQ
      </span>
    </div>
  );
}
