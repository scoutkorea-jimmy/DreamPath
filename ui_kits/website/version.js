// version.js — KoreaDreamPath site version, displayed in the public footer
// and admin sidebar so the operator can see at a glance which build is live.
//
// Format: AA.bbb.cc
//   AA  — major. Only the human operator bumps this (intentional milestones).
//   bbb — minor. Bumped by Claude whenever a new feature ships.
//   cc  — patch. Bumped for hotfixes / bug fixes / copy tweaks.
//
// When you bump this, also append a row to the KMS Change log (admin → Wiki).
window.DREAMPATH_VERSION = '01.018.00';
