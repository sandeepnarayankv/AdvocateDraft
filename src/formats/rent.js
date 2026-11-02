'use strict';

// Rent and eviction. State rent laws differ widely, so the State Act, section
// and forum are placeholders the advocate must fill.

const { advocateBlock, verification, affidavitInSupport, partyBlock, listOfDocuments } = require('./common');

const RENT_NOTES =
  'Eviction depends on the State law that governs the premises: an older Rent Control Act, a newer Act based on the ' +
  'Model Tenancy Act, 2021 (with a Rent Authority / Rent Court), or — where no rent law applies, e.g. premises excluded ' +
  'by rent or area limits — the Transfer of Property Act through a civil suit. First check which law applies to these ' +
  'premises, then plead only the grounds that law allows, citing its section. Do not assume a State Act, section number, ' +
  'forum or notice period that is not in the material: use [TO CONFIRM]. Typical grounds include arrears of rent after ' +
  'demand, bona fide requirement for the landlord\'s own use, unauthorised sub-letting, damage, nuisance and misuse.';

const premises = `SCHEDULE OF THE PREMISES
[DOOR NO., FLOOR, BUILDING, STREET, AREA, CITY, PIN CODE], measuring about [__] sq. ft., bounded on the North by [__], South by [__], East by [__], West by [__].`;

module.exports = [
  {
    id: 'rent-eviction-petition',
    title: 'Eviction petition under the State rent law',
    category: 'Rent & eviction',
    forum: 'Rent Controller / Court of Small Causes / Rent Authority or Rent Court (as the State law provides)',
    law: 'The applicable State rent law (e.g. a State Rent Control Act or an Act based on the Model Tenancy Act, 2021)',
    use: 'Evicting a tenant protected by the State rent law, on a ground that law allows.',
    facts: [
      'Landlord(s) and tenant(s)',
      'Premises: full address and description',
      'Which State rent law applies, and why (rent, area, type of premises)',
      'Tenancy: start date, rent, written agreement if any',
      'Ground(s) for eviction with facts (arrears and demand notice; own bona fide need; sub-letting; damage; nuisance …)',
      'Notices sent and replies',
      'Arrears due, if any',
    ],
    annexures: ['Proof of ownership / landlordship', 'Rent agreement', 'Rent receipts', 'Demand / termination notice and proof of service', 'Documents supporting the ground (e.g. need for own use)'],
    instructions: RENT_NOTES,
    template: `BEFORE THE [RENT CONTROLLER / COURT OF SMALL CAUSES / RENT AUTHORITY] AT [PLACE]

[H.R.C. / EVICTION PETITION] No. [____] of [YEAR]

${partyBlock('PETITIONER / LANDLORD')}

VERSUS

${partyBlock('RESPONDENT / TENANT')}

PETITION UNDER SECTION [__] OF THE [STATE RENT ACT], [YEAR], FOR EVICTION OF THE TENANT

The Petitioner most respectfully submits as follows:

1. The Petitioner is the [OWNER AND LANDLORD] of the premises described in the Schedule below ("the premises").

2. The Respondent is a tenant of the premises under the Petitioner [UNDER A RENT AGREEMENT DATED [DATE] / ORALLY] from [DATE], on a monthly rent of Rs. [__] [EXCLUSIVE OF [CHARGES]].

3. The premises are governed by the [STATE RENT ACT] because [REASON — LOCATION, RENT, AREA, TYPE OF PREMISES].

GROUNDS FOR EVICTION
4. [GROUND UNDER SECTION [__](__): e.g. THE RESPONDENT HAS NOT PAID RENT FROM [MONTH] DESPITE A WRITTEN DEMAND DATED [DATE], SERVED ON [DATE]; ARREARS TOTAL Rs. [__].]

5. [GROUND UNDER SECTION [__](__): e.g. THE PETITIONER BONA FIDE REQUIRES THE PREMISES FOR [OWN OCCUPATION / OCCUPATION OF [FAMILY MEMBER]] BECAUSE [FACTS]; THE PETITIONER HAS NO OTHER REASONABLY SUITABLE ACCOMMODATION IN [CITY].]

6. [FURTHER GROUNDS.]

7. This [AUTHORITY / COURT] has jurisdiction as the premises are situated within its limits.

PRAYER
8. The Petitioner prays that this [AUTHORITY / COURT] may be pleased to:
(a) order the eviction of the Respondent from the premises and direct the Respondent to hand over vacant possession to the Petitioner;
(b) direct the Respondent to pay arrears of rent of Rs. [__] and [DAMAGES / CHARGES] until possession is delivered;
(c) award costs; and
(d) grant such other relief as it deems fit.

${premises}

${advocateBlock('PETITIONER')}

${verification('PETITIONER', 'petition')}

${affidavitInSupport('PETITIONER', 'petition')}

${listOfDocuments}`,
  },
  {
    id: 'rent-suit-possession',
    title: 'Suit for possession and mesne profits (tenancy terminated)',
    category: 'Rent & eviction',
    forum: 'Civil Court (where the State rent law does not apply to the premises)',
    law: 'Sections 106 and 111 Transfer of Property Act, 1882; Order VII Rule 1 & Order XX Rule 12 CPC',
    use: 'Recovering possession from a tenant whose tenancy has been terminated, with arrears and damages for use and occupation.',
    facts: [
      'Landlord(s) and tenant(s)',
      'Premises: full address and description',
      'Why no rent control law applies to these premises',
      'Tenancy: start date, rent, monthly or yearly',
      'Termination notice: date, period given, date served, date tenancy ended',
      'Arrears of rent up to termination',
      'Damages / mesne profits claimed per month after termination, and the basis',
    ],
    annexures: ['Title documents', 'Rent agreement', 'Termination notice with proof of service', 'Rent receipts / account statement', 'Evidence of the market rent (for mesne profits)'],
    instructions:
      `${RENT_NOTES} For a monthly tenancy, Section 106 TPA (as amended) requires 15 days' notice unless a contract or local ` +
      'law says otherwise; plead the notice, its service and the date the tenancy ended. Claim mesne profits from that ' +
      'date and ask for an inquiry into future mesne profits under Order XX Rule 12 CPC.',
    template: `IN THE COURT OF THE [CIVIL JUDGE] AT [PLACE]

ORIGINAL SUIT No. [____] of [YEAR]

${partyBlock('PLAINTIFF / LANDLORD')}

VERSUS

${partyBlock('DEFENDANT / TENANT')}

PLAINT UNDER ORDER VII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908, FOR RECOVERY OF POSSESSION, ARREARS OF RENT AND MESNE PROFITS

The Plaintiff most respectfully submits as follows:

1. The Plaintiff is the owner of the premises described in the Schedule below ("the premises").

2. The Defendant was a tenant of the premises under the Plaintiff from [DATE] on a monthly rent of Rs. [__], [UNDER AN AGREEMENT DATED [DATE]].

3. The premises are not governed by any rent control law because [REASON].

4. By a notice dated [DATE] under Section 106 of the Transfer of Property Act, 1882, served on the Defendant on [DATE], the Plaintiff terminated the tenancy with effect from [DATE] and called upon the Defendant to hand over vacant possession.

5. The tenancy stands terminated, but the Defendant continues in possession unlawfully and has not paid rent from [MONTH]. Arrears of rent up to [DATE] amount to Rs. [__].

6. The Defendant is liable to pay damages for use and occupation (mesne profits) from [DATE OF TERMINATION] at Rs. [__] per month, being the prevailing rent for similar premises.

CAUSE OF ACTION
7. The cause of action arose on [DATE] when the tenancy was terminated, and continues.

JURISDICTION, LIMITATION, VALUATION
8. The premises are within the jurisdiction of this Hon'ble Court. The suit is within time. The suit is valued at Rs. [__] for [POSSESSION / ARREARS / MESNE PROFITS] and court fee of Rs. [__] is paid under the [STATE] Court Fees and Suits Valuation Act.

PRAYER
9. The Plaintiff prays for a decree:
(a) directing the Defendant to deliver vacant possession of the premises to the Plaintiff;
(b) for arrears of rent of Rs. [__];
(c) for past mesne profits of Rs. [__] from [DATE] to the date of suit, and an inquiry into future mesne profits under Order XX Rule 12 till delivery of possession;
(d) for costs; and
(e) for such other relief as this Hon'ble Court deems fit.

${premises}

${advocateBlock('PLAINTIFF')}

${verification('PLAINTIFF', 'plaint')}

${affidavitInSupport('PLAINTIFF', 'plaint')}

${listOfDocuments}`,
  },
];
