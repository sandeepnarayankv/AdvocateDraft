'use strict';

// Arbitration and Conciliation Act, 1996 formats.

const { advocateBlock, affidavitInSupport, partyBlock, listOfDocuments } = require('./common');

const ARB_NOTES =
  'Arbitration practice: quote the arbitration clause verbatim with the agreement date and clause number; state the ' +
  'seat / venue and the governing law; set out the dispute and amounts. Distinguish a domestic arbitration from an ' +
  'international commercial arbitration (the court differs for appointments). A commercial dispute of specified value ' +
  'goes to the Commercial Court / Commercial Division under the Commercial Courts Act, 2015. Cite judgments only if ' +
  'they are in the material.';

const parties = `${partyBlock('PETITIONER')}

VERSUS

${partyBlock('RESPONDENT')}`;

module.exports = [
  {
    id: 'arb-21-notice',
    title: 'Notice invoking arbitration (Section 21)',
    category: 'Arbitration',
    forum: 'Sent to the other party to the arbitration agreement',
    law: 'Section 21 (commencement) and Section 11 (appointment), Arbitration and Conciliation Act, 1996',
    use: 'Starting arbitration: requesting that the dispute be referred and proposing an arbitrator.',
    facts: [
      'Your client and the other party (addresses for notice under the agreement)',
      'Agreement: date, title, arbitration clause (number and text)',
      'The dispute: what happened, amounts claimed',
      'Proposed arbitrator(s) or the appointment procedure in the clause',
    ],
    annexures: ['Copy of the agreement containing the arbitration clause'],
    instructions:
      'Arbitration commences on the date the respondent receives a request for the dispute to be referred (Section 21); ' +
      'limitation is counted to that date (Section 43(2)), so send it by a mode giving proof of receipt. Follow any ' +
      'procedure in the clause (notice period, number of arbitrators, institution). If the other side does not agree on ' +
      'an arbitrator within 30 days, an application under Section 11 lies. Whether arbitration commences on issuance or ' +
      'receipt has been the subject of litigation — ensure proof of receipt.',
    template: `[ADVOCATE NAME]
Advocate
[OFFICE ADDRESS, PHONE, EMAIL]

BY [REGISTERED POST A.D. / SPEED POST / COURIER / EMAIL AS PER CLAUSE [__] OF THE AGREEMENT]

Date: [DATE]

To,
[NAME OF OTHER PARTY]
[ADDRESS FOR NOTICES UNDER THE AGREEMENT]

Sub: Notice under Section 21 of the Arbitration and Conciliation Act, 1996 invoking arbitration under Clause [__] of the [AGREEMENT] dated [DATE]

Sir / Madam,

Under instructions from and on behalf of my client, [CLIENT NAME], [DESCRIPTION], I hereby give you notice as follows:

1. My client and you entered into the [AGREEMENT] dated [DATE] ("the Agreement").

2. Clause [__] of the Agreement provides: "[TEXT OF THE ARBITRATION CLAUSE]".

3. Disputes have arisen between the parties under the Agreement, namely: [DISPUTES, WITH AMOUNTS].

4. My client hereby invokes arbitration and requests that the above disputes be referred to arbitration in accordance with Clause [__].

5. My client proposes [NAME, DESIGNATION, ADDRESS] as the [SOLE ARBITRATOR / ARBITRATOR NOMINATED BY MY CLIENT]. You are called upon to [CONCUR IN THE APPOINTMENT / NOMINATE YOUR ARBITRATOR] within 30 days of receipt of this notice.

6. Please note that if you fail to do so, my client will approach the [HIGH COURT / COURT] under Section 11 of the Act for appointment of an arbitrator, at your risk as to costs.

7. This notice is without prejudice to my client's other rights and remedies.

Yours faithfully,

[ADVOCATE NAME]
Advocate for [CLIENT NAME]`,
  },
  {
    id: 'arb-9-interim',
    title: 'Petition for interim measures (Section 9)',
    category: 'Arbitration',
    forum: 'Principal Civil Court of original jurisdiction / Commercial Court / High Court with original jurisdiction',
    law: 'Section 9, Arbitration and Conciliation Act, 1996',
    use: 'Interim protection (preserving property, securing the amount in dispute, injunction) before, during or after arbitration.',
    facts: [
      'Parties and the agreement with the arbitration clause',
      'Stage: before arbitration started / tribunal constituted / after award',
      'The dispute and the amount at stake',
      'The threat: why the relief is urgent (dissipation of assets, alienation, breach)',
      'Specific interim measure sought',
    ],
    annexures: ['Agreement with the arbitration clause', 'Section 21 notice, if sent', 'Documents showing the urgency'],
    instructions:
      `${ARB_NOTES} Plead prima facie case, balance of convenience and irreparable harm. If the interim measure is sought ` +
      'before arbitration begins, state the intention to commence it: proceedings must start within 90 days of the order or ' +
      'such further time as the court fixes (Section 9(2)). Once the tribunal is constituted, the court will not entertain ' +
      'the petition unless the remedy under Section 17 is not efficacious (Section 9(3)) — explain why, if applicable.',
    template: `IN THE COURT OF THE [PRINCIPAL DISTRICT JUDGE / COMMERCIAL COURT / HIGH COURT] AT [PLACE]

ARBITRATION PETITION / A.A. No. [____] of [YEAR]

${parties}

PETITION UNDER SECTION 9 OF THE ARBITRATION AND CONCILIATION ACT, 1996, FOR INTERIM MEASURES OF PROTECTION

The Petitioner most respectfully submits as follows:

1. [THE PARTIES.]

2. The parties entered into the [AGREEMENT] dated [DATE]. Clause [__] provides for arbitration: "[TEXT]". The seat of arbitration is [PLACE].

3. Disputes have arisen as follows: [DISPUTES]. [THE PETITIONER ISSUED A NOTICE UNDER SECTION 21 ON [DATE] / INTENDS TO COMMENCE ARBITRATION WITHIN 90 DAYS.]

4. [THE URGENCY: FACTS SHOWING THE RESPONDENT IS ABOUT TO DISSIPATE ASSETS / ALIENATE THE PROPERTY / ACT IN BREACH.]

GROUNDS
5. (a) Prima facie case: [REASONS].
   (b) Balance of convenience: [REASONS].
   (c) Irreparable harm: [REASONS].
   (d) [IF THE TRIBUNAL IS CONSTITUTED: WHY THE REMEDY UNDER SECTION 17 IS NOT EFFICACIOUS.]

6. This Hon'ble Court has jurisdiction as [THE SEAT IS / THE PROPERTY IS / THE RESPONDENT RESIDES] within its limits.

PRAYER
7. The Petitioner prays that this Hon'ble Court may be pleased to:
(a) [RESTRAIN THE RESPONDENT FROM ALIENATING / ENCUMBERING THE PROPERTY DESCRIBED IN THE SCHEDULE];
(b) [DIRECT THE RESPONDENT TO FURNISH SECURITY / DEPOSIT Rs. [__]];
(c) grant ad-interim relief in the above terms pending disposal; and
(d) grant such other relief as this Hon'ble Court deems fit.

${advocateBlock('PETITIONER')}

${affidavitInSupport('PETITIONER', 'petition')}

${listOfDocuments}`,
  },
  {
    id: 'arb-11-appointment',
    title: 'Application for appointment of arbitrator (Section 11)',
    category: 'Arbitration',
    forum: 'High Court (domestic arbitration) / Supreme Court (international commercial arbitration)',
    law: 'Section 11(5) / 11(6), Arbitration and Conciliation Act, 1996',
    use: 'When the other party fails to agree on or appoint an arbitrator.',
    facts: [
      'Parties and the agreement with the arbitration clause',
      'Appointment procedure in the clause',
      'Section 21 notice: date sent, date received',
      "Respondent's response (or failure to respond within 30 days)",
      'Whether domestic or international commercial arbitration',
      'Proposed arbitrator (optional)',
    ],
    annexures: ['Agreement with the arbitration clause', 'Section 21 notice and proof of receipt', 'Reply, if any'],
    instructions:
      `${ARB_NOTES} Show the arbitration agreement exists, the notice invoking arbitration was received, and the ` +
      'respondent failed to act within 30 days (Section 11(4)/(5)) or the agreed procedure failed (Section 11(6)). Keep ' +
      'it short: at this stage the court looks mainly at the existence of the arbitration agreement.',
    template: `IN THE HIGH COURT OF [STATE] AT [PLACE]

ARBITRATION APPLICATION / C.M.P. No. [____] of [YEAR]

${parties.replace(/PETITIONER/g, 'APPLICANT')}

APPLICATION UNDER SECTION 11([5] / [6]) OF THE ARBITRATION AND CONCILIATION ACT, 1996, FOR APPOINTMENT OF AN ARBITRATOR

The Applicant most respectfully submits as follows:

1. The parties entered into the [AGREEMENT] dated [DATE]. Clause [__] provides: "[TEXT OF THE ARBITRATION CLAUSE]".

2. Disputes have arisen between the parties regarding [DISPUTES].

3. The Applicant issued a notice dated [DATE] under Section 21, received by the Respondent on [DATE], invoking arbitration and [PROPOSING [NAME] AS SOLE ARBITRATOR / CALLING UPON THE RESPONDENT TO APPOINT ITS ARBITRATOR].

4. The Respondent [HAS FAILED TO RESPOND WITHIN 30 DAYS / REPLIED ON [DATE] REFUSING]. The appointment procedure agreed between the parties has thus failed.

5. The arbitration agreement is valid and subsisting, and the disputes fall within it. [THE ARBITRATION IS A DOMESTIC ARBITRATION SEATED AT [PLACE].]

PRAYER
6. The Applicant prays that this Hon'ble Court may be pleased to appoint [AN INDEPENDENT SOLE ARBITRATOR / [NAME]] to adjudicate the disputes between the parties under the [AGREEMENT] dated [DATE], and pass such other orders as this Hon'ble Court deems fit.

${advocateBlock('APPLICANT')}

${affidavitInSupport('APPLICANT', 'application')}`,
  },
  {
    id: 'arb-34-set-aside',
    title: 'Petition to set aside arbitral award (Section 34)',
    category: 'Arbitration',
    forum: 'Principal Civil Court / Commercial Court / High Court with original jurisdiction (court of the seat)',
    law: 'Section 34, Arbitration and Conciliation Act, 1996',
    use: 'Challenging an arbitral award on the limited grounds in Section 34.',
    facts: [
      'Parties, the agreement and the arbitration clause',
      'Arbitral tribunal and the award: date, operative part',
      'Date the signed award was received (limitation)',
      'Grounds under Section 34(2) / 34(2A)',
      'Date the prior notice under Section 34(5) was issued to the other party',
    ],
    annexures: ['Signed copy of the arbitral award', 'Agreement', 'Pleadings and key evidence before the tribunal', 'Prior notice under Section 34(5)'],
    instructions:
      `${ARB_NOTES} Limitation is strict: three months from receipt of the signed award, extendable by a further 30 days ` +
      'for sufficient cause and not thereafter (Section 34(3)). Courts have differed on whether "three months" means calendar ' +
      'months or 90 days — file within 90 days to be safe. Confine the grounds to Section 34(2) (incapacity, invalid agreement, ' +
      'no proper notice, matters beyond the reference, improper composition or procedure, non-arbitrability, conflict with ' +
      'the public policy of India) and, for domestic awards, patent illegality on the face of the award (Section 34(2A)) — ' +
      'not a re-appreciation of evidence. State that prior notice was issued under Section 34(5). The court is to dispose of ' +
      'the petition within one year (Section 34(6)). Filing does not by itself stay the award: seek a stay under Section 36(3) separately.',
    template: `IN THE COURT OF THE [PRINCIPAL DISTRICT JUDGE / COMMERCIAL COURT / HIGH COURT] AT [PLACE]

ARBITRATION SUIT / O.M.P. No. [____] of [YEAR]

${parties}

PETITION UNDER SECTION 34 OF THE ARBITRATION AND CONCILIATION ACT, 1996, TO SET ASIDE THE ARBITRAL AWARD DATED [DATE]

The Petitioner most respectfully submits as follows:

1. [THE PARTIES AND THE AGREEMENT DATED [DATE] WITH ITS ARBITRATION CLAUSE.]

2. Disputes were referred to [THE SOLE ARBITRATOR / ARBITRAL TRIBUNAL COMPRISING [NAMES]], seated at [PLACE].

3. By the award dated [DATE], the Tribunal [OPERATIVE PART OF THE AWARD]. A signed copy of the award was received by the Petitioner on [DATE].

4. Prior notice of this petition under Section 34(5) was issued to the Respondent on [DATE].

GROUNDS
5. (a) [THE AWARD DEALS WITH A DISPUTE NOT CONTEMPLATED BY / BEYOND THE SCOPE OF THE SUBMISSION — SECTION 34(2)(a)(iv).]
   (b) [THE PETITIONER WAS UNABLE TO PRESENT ITS CASE — SECTION 34(2)(a)(iii).]
   (c) [THE AWARD IS IN CONFLICT WITH THE PUBLIC POLICY OF INDIA — SECTION 34(2)(b)(ii). REASONS.]
   (d) [THE AWARD IS VITIATED BY PATENT ILLEGALITY APPEARING ON THE FACE OF THE AWARD — SECTION 34(2A). REASONS.]

LIMITATION
6. The signed award was received on [DATE]; this petition is filed on [DATE], within three months under Section 34(3).

PRAYER
7. The Petitioner prays that this Hon'ble Court may be pleased to set aside the arbitral award dated [DATE] passed by [TRIBUNAL], [IN WHOLE / TO THE EXTENT OF [__]], with costs.

${advocateBlock('PETITIONER')}

${affidavitInSupport('PETITIONER', 'petition')}

${listOfDocuments}`,
  },
  {
    id: 'arb-36-enforcement',
    title: 'Execution petition to enforce arbitral award (Section 36)',
    category: 'Arbitration',
    forum: 'Civil court having jurisdiction where the assets are / Commercial Court',
    law: 'Section 36, Arbitration and Conciliation Act, 1996; Order XXI CPC',
    use: 'Enforcing an arbitral award as if it were a decree of the court.',
    facts: [
      'Award-holder and judgment-debtor',
      'Award: date, tribunal, operative part, amount with interest',
      'Date of receipt of the award; whether a Section 34 petition was filed and its status (stay or not)',
      'Payments received, if any',
      'Assets of the judgment-debtor and mode of execution sought',
    ],
    annexures: ['Signed copy of the award', 'Status of any Section 34 proceedings', 'Particulars of the assets'],
    instructions:
      'An award becomes enforceable as a decree once the time for a Section 34 challenge has expired, or such a challenge is ' +
      'refused; a pending Section 34 petition does not stay enforcement unless the court grants a stay under Section 36(3). ' +
      'Use the tabular particulars of Order XXI Rule 11(2) CPC.',
    template: `IN THE COURT OF THE [COURT] AT [PLACE]

EXECUTION PETITION No. [____] of [YEAR]

[AWARD-HOLDER] ... DECREE-HOLDER / AWARD-HOLDER
VERSUS
[JUDGMENT-DEBTOR] ... JUDGMENT-DEBTOR

EXECUTION PETITION UNDER SECTION 36 OF THE ARBITRATION AND CONCILIATION ACT, 1996, READ WITH ORDER XXI RULE 11(2) OF THE CODE OF CIVIL PROCEDURE, 1908

The Award-Holder prays for execution of the arbitral award, the particulars of which are as follows:

1. Award: dated [DATE], passed by [TRIBUNAL] in the arbitration between the parties
2. Date of receipt of the signed award: [DATE]
3. Challenge under Section 34: [NONE FILED; TIME EXPIRED ON [DATE] / FILED AS [NO.]; NO STAY GRANTED / DISMISSED ON [DATE]]
4. Payment or adjustment made, if any: [__]
5. Previous applications for execution: [NONE]
6. Amount due under the award with interest up to [DATE]: Rs. [__]
7. Costs awarded: Rs. [__]
8. Person against whom execution is sought: [NAME]
9. Mode of execution: [ATTACHMENT AND SALE OF THE PROPERTY IN THE SCHEDULE / ATTACHMENT OF BANK ACCOUNTS / ARREST AND DETENTION / OTHER]

PRAYER
The Award-Holder prays that the award be enforced as a decree of this Hon'ble Court in the manner stated above and the amount due with costs of execution be recovered.

SCHEDULE OF ASSETS
[DESCRIPTION]

${advocateBlock('AWARD-HOLDER')}`,
  },
];
