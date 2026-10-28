# Daily devlogs

The owner's workflow, 2026-10-25: keep development on main and prepare player-facing devlogs on request, usually at the end of a session. Compiling a draft and publishing it are separate actions. There is no scheduled publishing and no release branch is needed.

## Files and numbering

Posts live in `doc/devlogs/`. Use `yyyy_mm_dd_[update number]_headline_feature.md`, for example `2026_10_25_001_a_free_camera_for_exploring_the_plant.md`. This example is a filename illustration, not a claim that update 001 has been compiled or published.

Use the Europe/London calendar date and a globally increasing, zero-padded update number starting at 001. Numbers continue across days; they do not reset at midnight. Use lowercase words separated by underscores for the headline. Scan existing numbered posts before allocating the next number. Several sessions can update one unpublished draft; an additional post on the same day gets the next number. Keep published filenames and numbers stable, and keep the body of a published post as the record of what was actually posted.

`README.md` and `_template.md` are supporting documents, not numbered posts. Start each draft from [_template.md](_template.md). If a post needs images, place them in `assets/yyyy_mm_dd_NNN/` and record their final itch.io image URLs when publishing.

## When asked to compile

1. Read the latest published post's metadata to find the last covered source commit. Review the changes after that commit through the latest verified deployed source revision, using git history and diffs, CHANGELOG.md and diary entries together. Versions come from the build label (title screen, or itch.io's version): since mission 104 a push to `main` builds as the next patch derived from the history, with no version commits, and itch.io carries only releases (`Release vX.Y.Z` commits, tagged); older `Build vX.Y.Z [skip ci]` commits supply version information but are not player-facing features. With no previous published post, explicitly record the chosen initial coverage period rather than assuming all previous development belongs to today.
2. Check what is actually playable on itch.io and which release it carries (itch.io now receives releases only; GitHub Pages has every push to `main`). Separate shipped changes from local work and plans. A diary entry or an Unreleased changelog bullet alone is not proof of deployment. If deployment cannot be verified, leave that uncertainty in the draft metadata and describe the work without claiming it is already live.
3. Create or update the unpublished draft for this update number. Record the exact source coverage, build version, verification state and previous post in front matter. Include carried-over work since the previous published post even when several days have elapsed; explain the period in the prose. Do not repeat changes already covered by a published post. An unpublished draft does not advance the coverage baseline.
4. Write a short headline, a brief opening describing the most noticeable change, a few concrete highlights and fixes, and any known issues readers need to know. Prefer what players can see and do, with useful examples or screenshots, over implementation details, raw commit lists and test counts. Omit empty sections. Describe future plans as future plans.
5. Check every claim against the evidence, check links and images, and leave `status: draft`. Report the saved path and the coverage to the owner. Compiling does not upload a build, publish a post, create a release tag or change the deployment workflow.

## When asked to publish

Use the specified draft, or the most recent unpublished draft when the request clearly identifies it. Check whether its `itch_url` or the project's devlog list already contains this update number, so a retry does not create a duplicate. Recheck its build links and deployment claims. The owner's explicit request to publish authorises posting that draft; no additional confirmation is required when its scope and content are already clear.

Publish through the authenticated itch.io devlog editor for [The Pool](https://salimfadhley.itch.io/the-pool), converting the Markdown body into the format the editor accepts and excluding YAML front matter. Check the rendered formatting and upload any local screenshots through the editor. If a suitable authenticated browser connection is unavailable, provide the ready-to-paste post and state that it has not been published; do not mark it published or invent a URL. Request missing access only when an actual publication request requires it.

After publication, open the resulting post and verify its title, body, links and images. Set `status: published`, record `published_at` and `itch_url`, and add it to the table below. Its covered source revision becomes the baseline for the next update. If an attempt has an uncertain result, inspect the live devlog list before retrying. A later correction to a published post must also update the local record.

## Butler feasibility

Checked on 2026-10-25: the installed butler v15.32.0 exposes build upload and management commands, including `push`, `push-preview` and `status`, but no devlog-posting command. The official [butler documentation](https://itch.io/docs/butler/) and [upload documentation](https://itch.io/docs/butler/pushing.html) describe distributing builds; the [public server-side API reference](https://itch.io/docs/api/serverside) does not document creating devlogs. There is therefore no supported butler command or documented public API endpoint we can use to publish this Markdown as a devlog.

Itch.io does support devlog posts on project pages, including build and image attachments and distribution to followers' feeds: see [Introducing devlogs](https://itch.io/updates/introducing-devlogs). The practical route is an editor publication step, performed manually or through an available authenticated browser. Butler remains the tool for build uploads; uploading a Markdown file as a downloadable artifact would not create a devlog. Authenticated editor publication was verified for update 001 on 2026-10-25 using Chrome's Apple Events JavaScript support: select General Update, enter the body through the editor's HTML view, attach the covered build, enable Published and Save. Verify the resulting post and project access separately: a published post on a Draft project remains unavailable to anonymous visitors. Changing the project's access mode is a separate owner decision.

## Published posts

| Update | Date | Headline | Local file | itch.io post |
| ------ | ---- | -------- | ---------- | ------------ |

| 001 | 2026-10-25 | A title sequence that flies through the building | [Local record](2026_10_25_001_a_title_sequence_that_flies_through_the_building.md) | [Published post](https://salimfadhley.itch.io/the-pool/devlog/1727746/a-title-sequence-that-flies-through-the-building) |

| 002 | 2026-10-26 | Filters, fault lights, and a plant you can read | [Local record](2026_10_26_002_filters_fault_lights_and_a_plant_you_can_read.md) | [Published post](https://salimfadhley.itch.io/the-pool/devlog/1730093/filters-fault-lights-and-a-plant-you-can-read) |

| 002 | 2026-10-26 | Filters, fault lights, and a plant you can read | [Local record](2026_10_26_002_filters_fault_lights_and_a_plant_you_can_read.md) | [Published post](https://salimfadhley.itch.io/the-pool/devlog/1730093/filters-fault-lights-and-a-plant-you-can-read) |

Update 001 is published within the project, which remains in Draft access mode as of publication. The post is verified while signed in; anonymous requests return HTTP 404.

Update 002 is published and verified with attached build 0.1.356. The project still has Draft access as of 2026-10-26; anonymous requests to the post return HTTP 404.

Update 002 is published and verified with attached build 0.1.356. The project still has Draft access as of 2026-10-26; anonymous requests to the post return HTTP 404.
