import Link from "next/link";

// Stitch design tokens — BRF Garage landing page
const c = {
  primary: "#004ac6",
  primaryContainer: "#2563eb",
  primaryFixed: "#dbe1ff",
  onPrimary: "#ffffff",
  onPrimaryFixedVariant: "#003ea8",
  onSurface: "#191c1e",
  onSurfaceVariant: "#434655",
  surface: "#f7f9fb",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerHigh: "#e6e8ea",
  outlineVariant: "#c3c6d7",
};

const features = [
  {
    icon: "map",
    title: "Interaktiv garagekarta",
    description:
      "Ladda upp er ritning, placera ut platser visuellt och se status färgkodat i realtid.",
  },
  {
    icon: "list_alt",
    title: "Rättvis FIFO-kö",
    description:
      "Boende ställer sig i kö och positionen baseras helt på ansökningsdatum. Full transparens för alla.",
  },
  {
    icon: "mail",
    title: "Automatiska erbjudanden",
    description:
      "När en plats blir ledig skickas erbjudandet automatiskt till nästa person i kön med en tydlig tidsfrist.",
  },
  {
    icon: "bookmark",
    title: "Intressemarkering",
    description:
      "Kömedlemmar kan markera specifika platser de är intresserade av, t.ex. laddplatser eller bredare rutor.",
  },
  {
    icon: "history",
    title: "Händelselogg",
    description:
      "Varje kö-åtgärd loggas oföränderligt. Ni har alltid bevis på att tilldelningen skett korrekt.",
  },
  {
    icon: "person_add",
    title: "Inbjudningsbaserad åtkomst",
    description:
      "Administratören bjuder in medlemmar via e-post. Ingen publik registrering krävs.",
  },
];

const steps = [
  {
    number: "1",
    title: "Admin konfigurerar",
    description:
      "Ladda upp garageplanen, bjud in era boende och publicera den digitala kartan.",
  },
  {
    number: "2",
    title: "Boende ställer sig i kö",
    description:
      "Medlemmar loggar in, ser sin köplats och markerar vilka platser de föredrar.",
  },
  {
    number: "3",
    title: "Erbjudanden skickas",
    description:
      "Vid ledig plats skickas automatiskt mejl till nästa person. Vid nej går turen vidare.",
  },
];

export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: "var(--font-inter), sans-serif",
        color: c.onSurface,
        backgroundColor: c.surface,
        minHeight: "100vh",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 50,
          backgroundColor: "rgba(247,249,251,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 48px",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: c.onSurface,
              letterSpacing: "-0.02em",
            }}
          >
            BRF Garage
          </div>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: c.primary,
              textDecoration: "none",
            }}
          >
            Logga in
          </Link>
        </div>
      </nav>

      <main style={{ paddingTop: 96 }}>
        {/* Hero */}
        <section
          style={{
            padding: "48px 48px 96px",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 64,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <h1
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: "clamp(40px, 5vw, 68px)",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  color: c.onSurface,
                  margin: 0,
                }}
              >
                Hantera garageköer enkelt och rättvist.
              </h1>
              <p
                style={{
                  fontSize: 20,
                  color: c.onSurfaceVariant,
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                BRF Garage hjälper din bostadsrättsförening att digitalisera
                kön, garagekartan och tilldelningen av parkeringsplatser — helt
                automatiskt.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <Link
                  href="/login"
                  style={{
                    padding: "16px 32px",
                    background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryContainer} 100%)`,
                    color: c.onPrimary,
                    fontWeight: 600,
                    borderRadius: 12,
                    textDecoration: "none",
                    display: "inline-block",
                    boxShadow: "0 4px 14px rgba(0,74,198,0.3)",
                  }}
                >
                  Kom igång
                </Link>
                <Link
                  href="/login"
                  style={{
                    padding: "16px 32px",
                    border: `2px solid ${c.outlineVariant}`,
                    color: c.onSurface,
                    fontWeight: 600,
                    borderRadius: 12,
                    textDecoration: "none",
                    display: "inline-block",
                    backgroundColor: "transparent",
                  }}
                >
                  Logga in
                </Link>
              </div>
            </div>

            {/* Hero image */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  backgroundColor: c.surfaceContainerLow,
                  borderRadius: 24,
                  padding: 16,
                  boxShadow:
                    "0 25px 50px -12px rgba(0,0,0,0.25)",
                }}
              >
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfekCCit6tKMqAXTyZgtjWh7sKk_jD7fBmcwyiQH-LrvyVEDyCsxCkxWsE9U7B_0HeQnBoZmGM5HI8uSVqNHURIjBAKCUvkj3bK0TbcFaEwBaAqRAvziQg5OJ-93l-HtXYlsGpN6ItE5rzsnBMIHFLmzUfKaMSjw6S895ZITT4OWbXYkNZfRTleVs3juJ7qljW3orpI2DVoct_S9ARoCobogzdb0XLce_0d-8EPKTDRpYl_DqtoakpjaVhArsM1QN7mH1GhSrf8l8"
                  alt="Garage map dashboard"
                  style={{
                    borderRadius: 16,
                    width: "100%",
                    height: "auto",
                    aspectRatio: "4/3",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
              {/* Floating spot card */}
              <div
                style={{
                  position: "absolute",
                  bottom: -24,
                  left: -24,
                  backgroundColor: c.surfaceContainerLowest,
                  padding: 24,
                  borderRadius: 16,
                  boxShadow:
                    "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: c.primaryFixed,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: c.primary,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20 }}
                    >
                      directions_car
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Plats 42</div>
                    <div style={{ fontSize: 12, color: c.onSurfaceVariant }}>
                      Status: Ledig
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: c.primaryFixed,
                    color: c.onPrimaryFixedVariant,
                    padding: "4px 12px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    display: "inline-block",
                  }}
                >
                  Ledig
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            backgroundColor: c.surfaceContainerLow,
            padding: "96px 48px",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ marginBottom: 64 }}>
              <h2
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: 30,
                  fontWeight: 700,
                  marginBottom: 16,
                  letterSpacing: "-0.02em",
                  color: c.onSurface,
                }}
              >
                Funktioner för en modern förening
              </h2>
              <div
                style={{
                  width: 80,
                  height: 6,
                  backgroundColor: c.primary,
                  borderRadius: 9999,
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 32,
              }}
            >
              {features.map((f) => (
                <div
                  key={f.title}
                  style={{
                    backgroundColor: c.surfaceContainerLowest,
                    padding: 32,
                    borderRadius: 16,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: c.primary,
                      fontSize: 32,
                      display: "block",
                      marginBottom: 24,
                    }}
                  >
                    {f.icon}
                  </span>
                  <h3
                    style={{
                      fontFamily: "var(--font-manrope), sans-serif",
                      fontWeight: 700,
                      fontSize: 20,
                      marginBottom: 12,
                      color: c.onSurface,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      color: c.onSurfaceVariant,
                      lineHeight: 1.65,
                      margin: 0,
                      fontSize: 15,
                    }}
                  >
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: "128px 48px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 80 }}>
              <h2
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: 36,
                  fontWeight: 800,
                  marginBottom: 16,
                  letterSpacing: "-0.02em",
                  color: c.onSurface,
                }}
              >
                Så fungerar det
              </h2>
              <p style={{ color: c.onSurfaceVariant }}>
                Från kaos till ordning på tre enkla steg.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 48,
                position: "relative",
              }}
            >
              {/* Connector line */}
              <div
                style={{
                  position: "absolute",
                  top: 40,
                  left: "calc(16.66% + 12px)",
                  right: "calc(16.66% + 12px)",
                  height: 1,
                  backgroundColor: c.surfaceContainerHigh,
                }}
              />
              {steps.map((step) => (
                <div
                  key={step.number}
                  style={{ textAlign: "center", position: "relative" }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      backgroundColor: c.primaryContainer,
                      color: c.onPrimary,
                      fontFamily: "var(--font-manrope), sans-serif",
                      fontWeight: 700,
                      fontSize: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 32px",
                      position: "relative",
                      zIndex: 1,
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.15)",
                    }}
                  >
                    {step.number}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-manrope), sans-serif",
                      fontWeight: 700,
                      fontSize: 20,
                      marginBottom: 16,
                      color: c.onSurface,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      color: c.onSurfaceVariant,
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Target audience / CTA */}
        <section style={{ padding: "96px 24px", backgroundColor: c.surface }}>
          <div
            style={{ maxWidth: 768, margin: "0 auto", textAlign: "center" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: c.primaryFixed,
                color: c.onPrimaryFixedVariant,
                padding: "6px 16px",
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 32,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                cloud
              </span>
              SaaS · Per förening · Månadsabonnemang
            </div>
            <h2
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: 36,
                fontWeight: 800,
                marginBottom: 32,
                letterSpacing: "-0.02em",
                color: c.onSurface,
              }}
            >
              Byggt för bostadsrättsföreningar.
            </h2>
            <p
              style={{
                fontSize: 20,
                color: c.onSurfaceVariant,
                lineHeight: 1.65,
                marginBottom: 48,
              }}
            >
              Oavsett om ni har 10 eller 500 platser så automatiserar BRF
              Garage den tråkigaste biten av styrelsearbetet. Ni betalar en
              fast månadsavgift baserat på föreningens storlek. Inga dolda
              startavgifter eller bindningstider.
            </p>
            <button
              style={{
                padding: "20px 40px",
                backgroundColor: c.onSurface,
                color: c.surface,
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 18,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-manrope), sans-serif",
              }}
            >
              Kontakta oss för offert
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "48px 0",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 48px",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: c.onSurface,
              }}
            >
              BRF Garage
            </div>
            <span
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: 14,
                color: "#64748b",
              }}
            >
              © 2025 BRF Garage
            </span>
          </div>
          <Link
            href="/login"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: 14,
              color: "#64748b",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            Logga in
          </Link>
        </div>
      </footer>
    </div>
  );
}
