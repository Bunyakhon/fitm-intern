"""Normalize narrative spacing in authored reports; never edit application files."""
from pathlib import Path
import re
OUT=Path(__file__).resolve().parent.parent
replacements='''showAlertModal|showActionModal
Studentworkplaceaverage|Student workplace average
ProjectTeacher|Project Teacher
Homepagewidget|Homepage widget
FastAPIresponse|FastAPI response
Screenshotatrest|Screenshot at rest
Staffreview|Staff review
Studentresubmit|Student resubmits
Studentwrite|Student write
Teachernamespace|Teacher namespace
Escapewhenidle|Escape when idle
Mentorstamp|Mentor stamp
absentfeature|absent feature
accidentalcancel|accidental cancellation
activeindicator|active indicator
actualprivatepreview|actual private preview
advisorassignment|advisor assignment
afterreload|after reload
appointmentcapability|appointment capability
appointmentlink|appointment link
automaticallypublished|automatically published
automaticpublish|automatic publication
backgroundaction|background action
brokenimagepaths|broken image paths
coherentThai|coherent Thai
completefreshacceptancepasses|complete fresh acceptance passes
correctsection|correct section
currentActual|current Actual
currentversion|current version
directservice|direct service
disabledfeature|disabled feature
duplicatevisit|duplicate visit
fullreadable|full readable
horizontalpageoverflow|horizontal page overflow
identitycheckbox|identity checkbox
innercontent|inner content
intentionallyscrollabletable|intentionally scrollable table
invalidfield|invalid field
invalidlinks|invalid links
linkinvalid|link invalid
linkmissing|link missing
liveverification|live verification
markreviewed|mark reviewed
measurecontrast|measure contrast
misleadingtransfer|misleading transfer
missingsearchpage|missing search page
missingtoken|missing token
mobiletouch|mobile touch
nativefilepicker|native file picker
oldlinkinvalid|old link invalid
onlylocalstoragepersistence|only localStorage persistence
preservesinput|preserves input
primarydata|primary data
productflow|product flow
productrequirement|product requirement
readabletoastduration|readable toast duration
refreshpersisteddata|refresh persisted data
replayfailure|replay failure
requestcancelled|request cancelled
requestrevision|request revision
requiredfields|required fields
retryafterfailure|retry after failure
retryrecovers|retry recovers
revieweraccess|reviewer access
rolenamespace|role namespace
savedreason|saved reason
scopedpublish|scoped publication
secondwrite|second write
serviceanswer|service answer
sessionclears|session clears
silentbutton|silent button
softkeyboard|soft keyboard
staleversion|stale version
successdespitefailedrefresh|success despite failed refresh
truncatedmonthtitle|truncated month title
verificationhash|verification hash
verifiedmentor|verified Mentor
wrongdepartment|wrong department
Missingdependencies|Missing dependencies
Pythonfiles|Python files
Staffcalendar|Staff calendar
Staffcancellation|Staff cancellation
Studentcancellationmodal|Student cancellation modal
acceptedfeatures|accepted features
activityChromevariants|activity Chrome variants
actualJSONsummaries|actual JSON summaries
actualresults|actual results
allnegative|all negative
allresponsive|all responsive
anyseparate|any separate
assertionFAIL|assertion FAIL
calendarSQL|calendar SQL
canonicalisolated|canonical isolated
checklistfor|checklist for
companyresponse|company response
devcredentialsSQL|development credentials SQL
documentsSQL|documents SQL
everytrueclause|every actual clause
evidenceCLI|evidence CLI
exactremainingfilelist|exact remaining file list
existingapproveddisposableSQL|existing approved disposable SQL
existingdist|existing dist
finalcompletePASS|final complete PASS
fixtureChrome|fixture Chrome
historicallogs|historical logs
historicalmobilePNG|historical mobile PNG
historicalrun|historical run
hunkssource|hunks source
olderfeaturelogs|older feature logs
originalPDF|original PDF
preserveoldartifacts|preserve old artifacts
previousacceptance|previous acceptance
projectadvisorSQL|project advisor SQL
projectfilesSQL|project files SQL
provenancebind|bind provenance of
recordedbehavior|recorded behavior
reportvalidation|report validation
roleworkflowSQL|role workflow SQL
secondengine|second engine
securitypolicy|security policy
semanticreview|semantic review
targetedfiles|targeted files
targetedpaths|targeted paths
thattestedpath|that tested path
uncommitteddiffs|uncommitted diffs
unreviewedsourcefolder|unreviewed source folder
verifiedstatus|verified status
whereenvironmentalreadypermits|where environment already permits
Studentaccount|Student account
Studentshape|Student shape
authrevocation|auth revocation
workingtree|working tree
expiredjob|expired job
thattestedpath|that tested path
currenthashmanifest|current hash manifest
freshinvocationseparately|fresh invocation separately
fullsemanticreview|full semantic review
noautomaticrollout|no automatic rollout
noautomaticpublish|no automatic publication
disposableledger|disposable ledger
primaryledger|primary ledger
rolloutclaim|rollout claim
allsource|all source
allmigration|all migration
sourceversion|source version
futureappointment|future appointment
scoringpolicy|scoring policy
nativeinteractions|native interactions
upload/nativeinteractions|upload/native interactions
featurelogs|feature logs
Teacherresultdraft|Teacher result draft
fullhistory|full history
development/config/secret|development/config/secret
links12|links 12
PNGmetadata|PNG metadata
NEXT_DAYtop|NEXT_DAY top
actualTAP|actual TAP
previouslogs|previous logs
rawlogs|raw logs
targetedSQL|targeted SQL
dailyfinalSQL|daily final SQL
supervisionChrome|supervision Chrome
finalregression|final regression
resultsfinalSQL|results final SQL
earlierfailures|earlier failures
thatrun|that run
remainingpaths|remaining paths
onlyselectedexcerpts|only selected excerpts
provisionalstatus|provisional status
inventingIDs|inventing IDs
remaininglegacycontrollers|remaining legacy controllers
checktrigger|check trigger
restartinventory|restart inventory
selectedcancellation|selected cancellation
storefreshinvocationseparately|store fresh invocation separately
recordActual|record Actual
migrationdecision|migration decision
automaticrollout|automatic rollout
protecteddevelopment|protected development
diffagain|diff again
authorizedoutputs|authorized outputs
ownershipcleanup|ownership cleanup
exitcode|exit code
testcases|test cases
sourcepaths|source paths
recordActual|record Actual
allresponsive|all responsive
allnegative|all negative
rolecapability|role capability
source/configuration|source/configuration
'''
mapping=dict(line.split('|',1)for line in replacements.splitlines()if '|'in line)
for p in OUT.glob('*.md'):
    text=p.read_text(encoding='utf8')
    for old,new in mapping.items():
        text=re.sub(r'(?<![A-Za-z])'+re.escape(old)+r'(?![A-Za-z])',lambda m,new=new:new,text)
    # Only narrative phrases, never numeric identifiers or route paths.
    for a,b in [('all13screens','all 13 screens'),('all13','all 13'),('source47','source 47'),('Other33PNGfiles','Other 33 PNG files'),('393historicalartifactfiles','393 historical artifact files'),('12actualJSON','12 actual JSON'),('13entries','13 entries'),('26page','26 page'),('17adapters','17 adapters'),('11CSS','11 CSS'),('15scripts','15 scripts'),('4seeders','4 seeders'),('46testfiles','46 test files'),('35Pythonfiles','35 Python files'),('258files','258 files'),('13screens','13 screens'),('currentfile','current file'),('changeduntracked','changed untracked'),('byassociation','by association'),('freshbrowser','fresh browser'),('historicalevidence','historical evidence'),('realChrome','real Chrome'),('readbackwhere','read-back where'),('freshacceptance','fresh acceptance'),('canonicalisolatedmode','canonical isolated mode'),('+37PNGmetadata','+ 37 PNG metadata'),('protects393','protects 393'),('all12','all 12'),('roleworkflowSQL','role workflow SQL'),('per-assertionsemantic','per-assertion semantic')]:
        text=text.replace(a,b)
    p.write_text(text,encoding='utf8')
print('Authored Markdown narrative spacing normalized.')
