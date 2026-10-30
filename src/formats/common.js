'use strict';

// Blocks shared by many Indian court formats. Placeholders are in
// [SQUARE BRACKETS]; the drafting model fills them from the matter or leaves
// [TO CONFIRM: …].

const advocateBlock = (party) => `Place: [PLACE]
Date: [DATE]

[NAME OF ${party}]
${party}

Through Counsel
[ADVOCATE NAME]
Advocate for the ${party}
Enrolment No. [ENROLMENT NO.]
[OFFICE ADDRESS, PHONE, EMAIL]`;

const verification = (party, document) => `VERIFICATION

I, [NAME OF ${party}], aged about [AGE] years, [OCCUPATION], residing at [ADDRESS], the ${party} above named, do hereby verify that the contents of paragraphs [__] to [__] of the above ${document} are true to my personal knowledge, those of paragraphs [__] to [__] are based on information received and believed to be true, and the remaining paragraphs are legal submissions made on advice. Nothing material has been concealed.

Verified at [PLACE] on this [DAY] day of [MONTH, YEAR].

[NAME OF ${party}]
${party}`;

const affidavitInSupport = (party, document) => `AFFIDAVIT

I, [NAME OF DEPONENT], [SON/DAUGHTER/WIFE] of [FATHER'S/HUSBAND'S NAME], aged about [AGE] years, [OCCUPATION], residing at [ADDRESS], do hereby solemnly affirm and state as follows:

1. I am the ${party} in the above matter and am well acquainted with its facts. I am competent to swear this affidavit.

2. The accompanying ${document} has been drafted under my instructions. Its contents have been read over and explained to me in [LANGUAGE], which I understand, and they are true and correct to my knowledge and belief.

3. The documents annexed are true copies of their originals.

DEPONENT

VERIFICATION

Verified at [PLACE] on this [DAY] day of [MONTH, YEAR] that the contents of the above affidavit are true and correct to my knowledge and belief, no part of it is false, and nothing material has been concealed.

DEPONENT`;

const partyBlock = (role) => `[FULL NAME], [SON/DAUGHTER/WIFE] of [FATHER'S/HUSBAND'S NAME],
Aged about [AGE] years, [OCCUPATION],
Residing at [FULL ADDRESS WITH PIN CODE]
... ${role}`;

const listOfDocuments = `LIST OF DOCUMENTS

Sl. No. | Description of document | Date | Original / Copy | Page
1. | [DOCUMENT] | [DATE] | [ORIGINAL/COPY] | [__]
2. | [DOCUMENT] | [DATE] | [ORIGINAL/COPY] | [__]`;

module.exports = { advocateBlock, verification, affidavitInSupport, partyBlock, listOfDocuments };
