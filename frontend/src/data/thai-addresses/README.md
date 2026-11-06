# Local Thai address data

Snapshot `fitm-th-address-2026-11-06.1`. Rebuild from the frontend directory with
`node scripts/vendorThaiAddresses.mjs`. This is a development download only; the
browser uses the bundled local JSON. No personal data is sent to these sources.

- Administrative names: [kongvut/thai-province-data](https://github.com/kongvut/thai-province-data), revision `07319ed40eb3440c9a1b17cc48fa223340ddce55` (2026-10-28; entity timestamps 2025-09-20), MIT © 2025 Kongvut Sangkla. Notice in `kongvut.LICENSE`.
- Postal cross-check and multiple codes: [earthchie/jquery.Thailand.js](https://github.com/earthchie/jquery.Thailand.js), revision `2f2737e560acc88e6bf1144e8fad3355a72d977d` (2024-08-31), raw database, WTFPL v2. Notice in `earthchie.LICENSE`. Its README/changelog documents postal corrections and multiple-code cases; it traces the original database to Thailand Post.

`metadata.json` records immutable revisions, source hashes, output hash and counts.
`areas.json` is `[province, [[district, [[subdistrict, postalCodes, optionalReviewReason]]]]]`.
Only Thai names and postal codes are retained, not coordinates, IDs or English names.

Verification: 77 provinces, 930 source district rows and 7,436 subdistricts; all
IDs unique, every parent reference valid, codes five digits. The source includes
two local-municipality district rows without subdistricts; these remain searchable
and support manual entry. Exact full-path cross-check finds 20 subdistricts with
multiple codes, 45 conflicting paths and 19 paths absent from the postal source.
Conflicts are **not** merged into valid choices. Those 64 paths have no automatic
postal code; the UI requests manual verification and preserves existing values.
This is a community dataset snapshot, not certification of every current delivery
area. Postcodes can depend on street/building; users must choose in multi-code
areas. No fuzzy matching, typo correction or guessed postcode is used.

Updating requires reviewing upstream licences, counts/relationship checks, postal
disagreements and focused regression tests before replacing this snapshot. Never
rewrite existing student addresses as part of a dataset update.
