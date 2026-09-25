# Study-Smart — legal review notes (internal, not for publication)

The drafts in `legal-src/` describe what the code does as of 23 September 2026. They are not legal advice and have not been reviewed by a lawyer.

## Business information (provided by the owner on 25 September 2026)

| Item | Value | Used in |
| --- | --- | --- |
| Operator | Deon Kayele (individual) | all documents |
| Address | Windhoek, Namibia | privacy, terms |
| Support email | kayeledeon@gmail.com | terms, EULA, in-app support |
| Privacy, rights-complaint and security email | iconicindustries0@gmail.com | privacy, copyright |
| Minimum age | 13; under 18 needs a parent's or guardian's permission | privacy, terms |
| Markets | Global | — |

Points to check about these details:

- **Address.** "Windhoek, Namibia" is a city, not a postal address. Consumer rules for online sellers often require a full geographic or postal address, e.g. Namibia's Electronic Transactions Act 4 of 2019 and EU/UK consumer law. Paddle will also ask for your address before approving payments. Consider a PO Box or business address.
- **Publishing your name and contact details.** Everything above appears in public documents inside the app. This is your choice; a registered business name and a dedicated domain email can be added later.
- **Age 13 with global markets.** Under GDPR Article 8, the age at which a child can consent on their own varies from 13 to 16 by EU country. Consent-based features (AI processing) may therefore need a parent's consent for 13–15-year-olds in some countries. In Google Play's target-audience form, declare 13+ and not "designed for children".

The AI features stay 18+ (Google's Gemini API terms). The footer now reads "© 2026 Deon Kayele".

Still missing: the AWS region of the entitlement service (only if Premium is used), and the production domain and host if you move off GitHub Pages.

## Questions for the lawyer

1. **Governing law and courts.** The operator is in Windhoek, Namibia (confirmed). Confirm Namibian law and courts. Mandatory consumer law in each user's country still applies.
2. **Liability limits** that are enforceable, without excluding non-waivable consumer rights.
3. **Minimum age:** the owner chose 13, with a parent's or guardian's permission under 18; the AI features are 18+. Confirm this per market.
4. **Privacy-law scope.** Namibia had no comprehensive data-protection statute in force as of mid-2026 (a Data Protection Bill was tabled in 2025); confirm the current position. Check GDPR, POPIA and other laws if the app targets those markets. Note: the operator receives almost no personal data (only Premium records).
5. **Namibian Electronic Transactions Act 4 of 2019:** consumer-information and cooling-off duties for online sales, even with Paddle as merchant of record.
6. **Paddle (merchant of record):** check the Terms section 6 wording against Paddle's seller terms and Buyer Terms, and against auto-renewal rules in the target markets.
7. **Copyright of scanned material.** Students may photograph textbooks and past papers for personal study. The app does not share content, but confirm the Terms wording.
8. **University names and the "example template" curricula.** These are unofficial example module lists shown under university names. Confirm this is acceptable, or remove the institution names from the templates. No logos are used.
9. **DMCA:** no user content is hosted, so a designated agent is probably unnecessary. Confirm.
10. **The app wipes local data after 10 wrong PIN attempts.** It warns before this happens, but make sure the Terms and in-app text are clear enough.

## Third-party licences to confirm

- The bundled `opencv.js`: record its version and include the Apache 2.0 licence text.
- The inline SVG icons: they resemble Feather Icons (MIT). Confirm and credit.
- Inter font 4.001: SIL OFL 1.1, bundled in `fonts/` with its licence (`fonts/OFL.txt`) and credited in `notices.html`.
