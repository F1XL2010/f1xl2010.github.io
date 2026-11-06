# Finding the relevant implementation

The source reference is dated **v409**, verified at the 6 November launch. Read the [manifest](../reference/portal-v409/manifest.json) for exact names/types/hashes. Some remote filenames have historical spelling or pluralisation; don't “fix” them by bulk upload. A future release must start with fresh deployed source.

| Area | Starting modules / repository files |
| --- | --- |
| Entry, navigation, theme | Code, Index, NavigationClient, AccessClient, AdminCentreDesign |
| Login, roles, gateways | AccessPolicy, AccessService, AccessClient; admincentre/ and next/fap-google-return.html |
| Real intake routing | IntakeConnections, ApplicationService, StaffApplicationService, PreseasonIntakeService, TicketSubmissionService, TicketIntakeService |
| TT / placement | PreseasonTimeTrialService, SelfTimeTrialSubmissionService, PreseasonPlacementService, ActiveSeasonService, DriverMovementService |
| Permanent identity / rename | DriverDatabaseService, SeasonDriverIdentityService, DriverRenameService |
| Season setup / draft | SeasonPlanningService, SeasonMasterService, PreseasonPrincipalsService, PreseasonPrincipalSeatService, PreseasonDraftService, PreseasonLiveDraftService, PreseasonAllocationService |
| Division build / launch | PreseasonPreparationService and historical PreseasonPreperationService, DivisionTemplateService, DivisionDataServices, SeasonLaunchService |
| Results / adjustments | ResultsEntryService/Client, ResultsAdjustmentService/Client, DivisionDataServices |
| Tickets / reviewer work | TicketSeasonService, TicketProcessingService/Client, TicketDeliveryService, StewardAccessService/Client |
| Licences / bans / carryover | LicenceService, LicenceSetupService; results/ticket callers and public drivers-licence.html |
| Form driver-list integration | TicketFormService; acceptance/rename/season hooks |
| TP / reserves coordinator | TeamPrincipalHubService/Client, FreeAgentHubService/Client |
| Streams / rules | DriverStreamsService/Client, LeagueRulesService/Client |
| ASR | ActiveAsrService/Client, ActiveAsrRaceNightClient, AsrService |
| Postseason / history | PostseasonService, HistoricalSeasonService, AccoladeService, CareerFormulaService, PublicHistoryService |
| Track records | TrackRecordsService; public track-records.html |
| Discord | DiscordGithubService/Client/View, DiscordApplicationService; bot/ and .github/workflows/ |
| Public current/history pages | Root HTML, config.js and its shared readers; inspect actual imports before editing |

Matching Client files generally render the UI; Service files perform server operations. This is a starting map, not a complete call graph. Search callers, constants, template builders and public readers before changing a schema. The exact role defaults are in [role-defaults-v409.json](../reference/role-defaults-v409.json); endpoint-level and own-record restrictions still apply.

Old tools/test-*.cjs/.js and release helpers are local evidence, often untracked and version-specific. Do not execute a script just because its name contains test: some create helpers or mutate connected workbooks. Inspect each script first. The pack's maintenance scripts are local documentation tools only.
