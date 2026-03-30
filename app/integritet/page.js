export const metadata = {
  title: 'Integritetspolicy — Mathandelsagenten',
  description: 'Hur Mathandelsagenten hanterar dina personuppgifter.',
}

const sectionStyle = { marginBottom: '32px' }
const h2Style = { fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }
const pStyle = { fontSize: '15px', lineHeight: '1.75', color: 'var(--text-muted)', marginBottom: '10px' }
const liStyle = { fontSize: '15px', lineHeight: '1.75', color: 'var(--text-muted)', marginBottom: '4px' }

export default function IntegritetPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
        Integritetspolicy
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>
        Senast uppdaterad: 30 mars 2026
      </p>

      <div style={sectionStyle}>
        <h2 style={h2Style}>1. Personuppgiftsansvarig</h2>
        <p style={pStyle}>
          Mathandelsagenten är personuppgiftsansvarig för behandlingen av dina personuppgifter.
          Tjänsten drivs som ett privat projekt och finns tillgänglig på mitt-projekt-one.vercel.app.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>2. Vilka uppgifter samlar vi in?</h2>
        <p style={pStyle}>Vi samlar in följande uppgifter när du använder tjänsten:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}><strong>E-postadress</strong> — används för inloggning och kontoverifiering</li>
          <li style={liStyle}><strong>Hushållsdata</strong> — antal vuxna, barn, veckbudget, matpreferenser och allergier</li>
          <li style={liStyle}><strong>Recept och menyer</strong> — recept du skapar eller sparar, veckomenyer och inköpslistor</li>
          <li style={liStyle}><strong>Skafferiinnehåll</strong> — varor du registrerar i ditt skafferi</li>
          <li style={liStyle}><strong>Betyg</strong> — dina betyg på recept</li>
          <li style={liStyle}><strong>Tekniska loggar</strong> — felrapporter via Sentry (anonymiserade stacktraces)</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>3. Varför behandlar vi dina uppgifter?</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}>Tillhandahålla tjänstens kärnfunktioner (menyplanering, inköpslistor, recept)</li>
          <li style={liStyle}>Anpassa AI-förslag efter ditt hushålls preferenser och allergier</li>
          <li style={liStyle}>Möjliggöra inloggning och sessionshantering</li>
          <li style={liStyle}>Felsökning och driftsäkerhet via anonyma felrapporter</li>
        </ul>
        <p style={{ ...pStyle, marginTop: '10px' }}>
          Rättslig grund: fullgörande av avtal (GDPR art. 6.1.b) och berättigat intresse för felsökning (art. 6.1.f).
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>4. Var lagras data?</h2>
        <p style={pStyle}>
          All data lagras hos <strong>Supabase</strong> på servrar i <strong>Frankfurt, EU</strong> (AWS eu-central-1).
          Inga personuppgifter överförs till länder utanför EU/EES utan adekvata skyddsåtgärder.
        </p>
        <p style={pStyle}>
          Felrapporter hanteras av <strong>Sentry</strong> och innehåller inga personuppgifter —
          bara anonymiserade tekniska stacktraces.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>5. Delning med tredje part</h2>
        <p style={pStyle}>
          Vi säljer eller delar <strong>aldrig</strong> dina personuppgifter med tredje part för marknadsföringsändamål.
          AI-förfrågningar skickas till <strong>Anthropic</strong> (Claude API) och innehåller hushållets preferenser
          men aldrig din e-postadress eller identifierande information.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>6. Cookies</h2>
        <p style={pStyle}>
          Vi använder <strong>enbart nödvändiga cookies</strong> för att hantera din inloggningssession (Supabase Auth).
          Inga spårningscookies, reklamcookies eller analysverktyg som Google Analytics används.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>7. Dina rättigheter</h2>
        <p style={pStyle}>Enligt GDPR har du rätt att:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}><strong>Tillgång</strong> — begära en kopia av dina uppgifter</li>
          <li style={liStyle}><strong>Rättelse</strong> — korrigera felaktiga uppgifter</li>
          <li style={liStyle}><strong>Radering</strong> — begära att ditt konto och all data raderas (se Inställningar → Radera konto)</li>
          <li style={liStyle}><strong>Dataportabilitet</strong> — begära dina uppgifter i maskinläsbart format</li>
          <li style={liStyle}><strong>Invändning</strong> — invända mot behandling baserad på berättigat intresse</li>
        </ul>
        <p style={{ ...pStyle, marginTop: '10px' }}>
          Du kan radera ditt konto direkt i appen under Inställningar. För övriga förfrågningar,
          kontakta oss via GitHub-projektet.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>8. Lagringstid</h2>
        <p style={pStyle}>
          Dina uppgifter sparas så länge ditt konto är aktivt. När du raderar ditt konto tas
          hushållsdata och personuppgifter bort omedelbart. Betyg anonymiseras (användar-ID sätts till null)
          för att bevara aggregerad statistik.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>9. Klagomål</h2>
        <p style={pStyle}>
          Om du anser att vi behandlar dina uppgifter felaktigt har du rätt att lämna klagomål
          till <strong>Integritetsskyddsmyndigheten (IMY)</strong> på imy.se.
        </p>
      </div>
    </div>
  )
}
