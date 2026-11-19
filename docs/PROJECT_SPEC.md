# **Final Product Requirements & Development Plan**

**Project name:** To be decided\
**Product type:** Full-stack, responsive web application\
**Target audience:** Young adults aged 18–28\
**Initial market:** Pakistan, with Karachi as the proposed pilot city\
**Development approach:** AI-assisted development through vibecoding

This document will serve as the master blueprint for your website. All the features you selected are included. I've also defined how they should interact, what each user should be able to do and how the website should be developed.

# **Part I — Product definition**

## **1. Product vision**

To create a centralised, personalised platform where young adults can discover authentic opportunities, explore hobbies, experience new things independently and collaboratively organise activities without the pressure of conventional social networking.

The platform enables users to grow academically, professionally and personally, regardless of their personality, social circle or willingness to network.

**Proposed tagline:** Experience more. Socialise on your terms.

## **2. Product objectives**

- Centralise scattered educational, professional and recreational opportunities.
- Reduce missed deadlines and exposure to fraudulent opportunities.
- Encourage independent experiences and exploration.
- Enable people to pursue shared interests without compulsory socialising.
- Simplify collaborative activity planning.
- Provide personalised recommendations based on individual preferences.
- Create a privacy-conscious and moderated environment for young adults.

## **3. Product architecture**

The platform will have five main interconnected modules.

All five modules will share the same user account, recommendation engine, notification system and database.

# **Part II — User roles and permissions**

## **4. Types of users**

| Functionality               | Guest | Member | Organisation | Admin |
| --------------------------- | ----- | ------ | ------------ | ----- |
| Browse public opportunities | ✓     | ✓      | ✓            | ✓     |
| Personalised dashboard      | —     | ✓      | ✓            | ✓     |
| Save opportunities          | —     | ✓      | ✓            | ✓     |
| Submit opportunities        | —     | ✓      | ✓            | ✓     |
| Publish official listings   | —     | —      | ✓            | ✓     |
| Submit solo experiences     | —     | ✓      | —            | ✓     |
| Create group activities     | —     | ✓      | —            | ✓     |
| Join and plan activities    | —     | ✓      | —            | ✓     |
| Verify submissions          | —     | —      | —            | ✓     |
| Manage reports              | —     | —      | —            | ✓     |
| Manage users                | —     | —      | —            | ✓     |

A member must complete the required identity verification before participating in in-person community activities.

# **Part III — Functional requirements**

## **5. Authentication and personalised onboarding**

**Requirement ID: FR-01**

Users should be able to register, log in, log out, verify their email address and reset their password.

The onboarding process should be divided into short, visually engaging steps rather than one lengthy registration form.

Proposed onboarding experience — interactive preview

Step 5 of 5

# **What opportunities are you looking for?**

InternshipsScholarshipsJobsMUNsHackathonsWorkshopsCompetitionsResearchVolunteeringExchange programmes

Back

Restart preview

Personality preferences should be optional. A user should never be prevented from discovering an opportunity because of their personality type.

## **6. Personalised dashboard**

**Requirement ID: FR-02**

The dashboard will be the central homepage for registered users.

# **Discover something new.**

Your next experience is waiting.

Search opportunities, hobbies, experiences...

# **12**

Saved opportunities

# **3**

Upcoming deadlines

**Recommended for you**

[Crunchtime for coders | Hub](https://images.openai.com/static-rsc-4/P17-3xFCN9AiADYE3irWO0tsrOGARKLF3TurFBna6W7ACoIPvqwVQKP7mLYEM2wYekgs8Bfz5fYsXN6l1whNEFqWtwS4aTsJuc8HTn3mggegX14_iel4w8YiaiIzyNpIC4yQ7D7P_rrJmVAPV0TlmshdO8a7x6_VQ0r-tdf746E?purpose=inline)

**Technology Hackathon**

Competition · Free

[منحة الدراسة في المجر للمغاربة 2026: فرصتك الذهبية للإجازة والماستر والدكتوراه | توظيفك](https://images.openai.com/static-rsc-4/wshuDqWjopYp7LhA_RiZhA6H4FPCN9-WgngJyVhSa0tnL2cKcXZdZF90G6Tg1784vIXIccIhNfG4JY_t67sG4tM86ChBF4k_aHRC2SztLBn65S2gXAjV3uLkpQygf0R-8MAHPfJ-b9RKBiRNeu7wYZAhldPbeCZPvBytKPgZ2zY?purpose=inline)

**Exchange Programme**

Scholarship · Fully funded

**Experiences you might enjoy**

[Free Matcha Filter Remover Online | AI Photo Tool](https://images.openai.com/static-rsc-4/91cUmq6XgH6jgwk7NKddktycXgMCtqUrJnuOBC62B5MF1QcAg6YjebtTZlLdqh5qHguT0I5uuJeIporRBujUilgCwO-22hBtwk5fDtI86tDr_GqLpJChKbUqqFpD9T-JTwDYPkhHYdqhxPCbmxC--B6gVNHEKSWWsLVBHD4--aw?purpose=inline)

**Silent Reading Circle**

Quiet company

[Upcoming Art Exhibitions in Barcelona 2024](https://images.openai.com/static-rsc-4/juJmOMkFsCXehbOI9FqSwSZo5pvZNaj8uHW-TMc-nFpxr_EF3QJDVG1N4uBLO0csmmoM-eYMcg42Coay63zNxKSdZprTaRemvccas1PMumpZkrKerj09RVDK39-9kPxZ_yBD2bkeddyf-zI-i5ftD8GJ9CB_g2h7-sGjV1SOqDU?purpose=inline)

**Explore an Art Gallery**

Solo experience

Home

Explore

Create

Calendar

Profile

Conceptual dashboard with fictional demonstration content.

The actual dashboard should display real data from the database, including recommended opportunities, nearby activities, upcoming deadlines, saved items and activity updates.

## **7. Opportunity discovery module**

**Requirement ID: FR-03**

### **Opportunity categories**

| Academic               | Professional     | Personal development |
| ---------------------- | ---------------- | -------------------- |
| Scholarships           | Internships      | Volunteering         |
| Exchange programmes    | Jobs             | Workshops            |
| Research opportunities | Hackathons       | Courses              |
| Conferences            | Entrepreneurship | Certifications       |
| MUNs                   | Fellowships      | Competitions         |

### **Opportunity listing requirements**

Every opportunity should contain:

| Field                       | Required?        |
| --------------------------- | ---------------- |
| Opportunity title           | Yes              |
| Category                    | Yes              |
| Organisation name           | Yes              |
| Description                 | Yes              |
| Official source URL         | Yes              |
| Application deadline        | If applicable    |
| Event start and end dates   | If applicable    |
| Eligibility requirements    | Yes              |
| Location                    | Yes              |
| Online / physical / hybrid  | Yes              |
| Cost or funding information | Yes              |
| Relevant interest tags      | Yes              |
| Poster or cover image       | Optional         |
| Verification status         | System-generated |
| Last verification date      | System-generated |
| Submitted by                | System-generated |

### **User functionality**

Users can browse, search, filter, save, share, report, track and submit opportunities. Applications will initially take place through the organiser's official website rather than through your platform.

## **8. Community submissions and AI-assisted verification**

**Requirement ID: FR-04**

This is one of the most important technical features of the website.

When a user submits an opportunity, it enters a verification queue rather than being published immediately.

\#chatgpt-mermaid-\_r_1d6\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1d6\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1d6\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1d6\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1d6\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1d6\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1d6\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1d6\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1d6\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1d6\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1d6\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1d6\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1d6\_ p{margin:0;}#chatgpt-mermaid-\_r_1d6\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1d6\_ .label text,#chatgpt-mermaid-\_r_1d6\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ .node rect,#chatgpt-mermaid-\_r_1d6\_ .node circle,#chatgpt-mermaid-\_r_1d6\_ .node ellipse,#chatgpt-mermaid-\_r_1d6\_ .node polygon,#chatgpt-mermaid-\_r_1d6\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .rough-node .label text,#chatgpt-mermaid-\_r_1d6\_ .node .label text,#chatgpt-mermaid-\_r_1d6\_ .image-shape .label,#chatgpt-mermaid-\_r_1d6\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1d6\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .rough-node .label,#chatgpt-mermaid-\_r_1d6\_ .node .label,#chatgpt-mermaid-\_r_1d6\_ .image-shape .label,#chatgpt-mermaid-\_r_1d6\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1d6\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1d6\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1d6\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1d6\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1d6\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1d6\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1d6\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1d6\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1d6\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1d6\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1d6\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1d6\_ .icon-shape,#chatgpt-mermaid-\_r_1d6\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1d6\_ .icon-shape p,#chatgpt-mermaid-\_r_1d6\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1d6\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1d6\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1d6\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1d6\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1d6\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1d6\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1d6\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1d6\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1d6\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1d6\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1d6\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1d6\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1d6\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1d6\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1d6\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1d6\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .node rect,#chatgpt-mermaid-\_r_1d6\_ .node circle,#chatgpt-mermaid-\_r_1d6\_ .node ellipse,#chatgpt-mermaid-\_r_1d6\_ .node polygon,#chatgpt-mermaid-\_r_1d6\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1d6\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1d6\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1d6\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1d6\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1d6\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Community submissionValidate required fieldsAI-assisted analysisCheck source and organiserCheck deadline and eligibilityCheck duplicates and scamindicatorsAdministrator reviewDecisionPublish listingNotify submitterRequest clarificationNotify matching usersApproveRejectMore evidence

### **AI verification report**

The AI should assist administrators by generating a structured report containing:

- Extracted opportunity information.
- Comparison between the submitted information and accessible official sources.
- Missing or inconsistent details.
- Duplicate listing indicators.
- Potential scam indicators.
- Recommended verification action.

The system must not fabricate evidence if a source cannot be accessed. In such cases, it should mark the information as requiring manual verification.

Example administrator verification report

**International Youth Fellowship**

Official source provided

Deadline matches source

Organiser identity confirmed

Review needed

Duplicate detected

No

AI recommendation: Request additional evidence of organiser identity before publishing.

**Important:** AI assists the verification process. The final decision belongs to a human moderator.

## **9. Verified organisation accounts**

**Requirement ID: FR-05**

Universities, student societies, NGOs, companies, event organisers and educational institutions can register as organisations.

Organisation accounts should provide their official name, website, official email address, representative details and supporting verification evidence.

Once approved, organisations can publish official opportunities, edit listings, update deadlines, cancel events and view basic listing engagement statistics.

Organisation verification and opportunity verification must remain separate. A verified organisation should not automatically make every listing accurate.

## **10. Application tracker and calendar**

**Requirement ID: FR-06**

Users should be able to manage their opportunities through a personal application tracker.

### **My applications**

Illustrative application tracker

International Exchange Programme

View application details

Preparing

Software Development Internship

View application details

Applied

Youth Innovation Hackathon

View application details

Shortlisted

Research Fellowship

View application details

Accepted

The tracker should support personal notes, custom reminders and application statuses.

The calendar automatically includes saved opportunity deadlines, application reminders, interviews manually added by users and confirmed community activities.

## **11. Solo experience discovery**

**Requirement ID: FR-07**

A dedicated section where users can find things to do without needing someone to accompany them.

[Services — The Art Partners](https://images.openai.com/static-rsc-4/yVe4b8HgHknK3TkS6bsYFyk0uzRFCOzDDUPXjcsMXTRW0zzQUytWhonmTVljlxdC8xQbyq1gZTLHLb6dCKmpGo9GyZkG2m-rEp5uXJbKT0220_rJX1GEMTHBicAhw0RPWzaAdYmmrs7m31Zp4nn5p0Iw2rFOE0g3NfbkGGwTfT4?purpose=inline)

**Explore art and culture**

Exhibitions, museums, galleries

[Resilience & Life Coaching | Hampton Roads, VA | The Resilience Group](https://images.openai.com/static-rsc-4/QEd9vsVKPzP1wFhwfgXgBuKV9cyn1cjwaTs4VO8pcx4mX_VAJlx0yYnovWydKaUD9cvNYg-B5GeJ8yMXnfiTiVyTCVgiAodmR8hIQggy9G3YPv2vPUQ602gplirWa2m6la3VdSA3nEoz8uHwn7M68IChZEmKr8ciB3odleQoQ24?purpose=inline)

**Slow experiences**

Reading, journaling, cafés

[Female potter working with clay on a pottery wheel.](https://images.openai.com/static-rsc-4/KYVpvAvRJ6QRcn87jYwBF2qyWF2hH7HdjdzwNgziKhR5kq9bgoI-SlSIyt18VanJd4zp2yTJ0IaH9Mrlu4Ee8v3wFgkr0Tt5aPY9QlbQWR0g47QZuHBGQqZESZhU7dF25GUUdv3IB3J3Ms8ykXcMFvFJA8DPm9r1Q3fUKY7dI1rAI818cO4tGE9ZZ7xlot7R?purpose=inline)

**Learn something new**

Pottery, painting, creative workshops

[Lauritzen Gardens in Spring & Summer | Omaha, NE Gardens](https://images.openai.com/static-rsc-4/6BGqLJC4cxNVlsPPbJsfuOsFh5pcO1haWU0gnoMWh0n48VP2DL0wagwyfqyRmeuAswDQQ0aX6SqCiyF7Qjd-TOJDKn01f0COMRaZIpD1qX9Smwke2jty42Nx7P4GJYsUq9iX1ytH4KI7meknkLgU6pAeCENv_KtOse3qQqxnBYU?purpose=inline)

**Outdoor exploration**

Photography, parks, nature

Each experience should contain its title, description, location, approximate cost, suggested duration, opening hours where applicable, relevant interests, social interaction level, safety considerations and accessibility information.

Community members can recommend experiences. These submissions should also undergo moderation before becoming publicly available.

## **12. Shared hobbies and collective planning**

**Requirement ID: FR-08**

This is your platform's second major differentiator.

Instead of creating conventional clubs with permanent organisers, users can propose individual experiences that interested participants organise together.

### **Activity lifecycle**

1. **Proposed** — A member suggests an activity.
2. **Gathering interest** — Other members request to participate.
3. **Planning** — Participants discuss and vote on arrangements.
4. **Confirmed** — The date, venue and time are finalised.
5. **Completed** — The activity takes place.
6. **Feedback** — Participants provide feedback or report issues.

Activities can also be cancelled at any stage, with notifications sent to participants.

### **Activity creation form**

| Field                    | Description                          |
| ------------------------ | ------------------------------------ |
| Activity title           | Name of proposed experience          |
| Hobby category           | Reading, photography, painting, etc. |
| Description              | What participants will do            |
| City                     | General location                     |
| Suggested venue          | Optional until planning              |
| Group size               | Minimum and maximum participants     |
| Estimated budget         | Cost per participant                 |
| Social interaction level | Quiet, small group or social         |
| Participation preference | Open or women-only                   |
| Experience level         | Beginner, intermediate or any        |
| Proposed dates           | Initial scheduling options           |

### **Collaborative planning room**

[The Art of Nature Journaling: Capturing Your Outdoor Experiences](https://images.openai.com/static-rsc-4/v7_fY35P6VfhBTirMF5nArEOgg-yDI075RuPbdS4mG3HYPDI1A87-7ypDCleqR_KgO-sQsJBs-aXUoER36yDRDnETJS1zJCXMUH00ZMdSPSrVMCCwodGX8pemMXnLxFp9RINkFBF9Gx4OO2vrBN-cbgd035ywIu_WitnWWYnZKU?purpose=inline)

[analogroots.com](https://analogroots.com/blog/the-art-of-nature-journaling-capturing-your-outdoor-experiences/?utm_source=chatgpt.com)

## **Weekend Sketching Circle**

Illustrative planning room · 5 participants

DiscussionPollsDetails

**When should we meet?**

Saturday, 3 PM3 votesSunday, 11 AM1 votesSunday, 4 PM1 votesSelect an option to try the voting interaction.

The actual planning room should support group discussions, polls, participant management, plan confirmation and activity cancellation.

Although everyone contributes to planning, a designated coordinator must be responsible for confirming the final arrangements and handling safety-related communication.

## **13. Recommendation engine**

**Requirement ID: FR-09**

The recommendation engine should use:

| Factor                          | Proposed importance |
| ------------------------------- | ------------------- |
| Interest match                  | 35%                 |
| Opportunity category preference | 20%                 |
| Location or online availability | 15%                 |
| Social comfort compatibility    | 15%                 |
| Budget compatibility            | 10%                 |
| Recency                         | 5%                  |

These are proposed starting weights, not experimentally validated values. Different content types can use different weights.

Illustrative recommendation algorithm

# **94%**

Recommendation match

Interest match

100%

Category match

100%

Location match

100%

Social comfort

60%

Budget match

100%

Adjust the factors to see how recommendations could be ranked. Recency is held constant in this example.

Before calculating scores, the system should exclude expired, unpublished and ineligible listings from relevant recommendations.

Social comfort should influence experience recommendations more strongly than academic or career recommendations.

This can initially be implemented using a rule-based algorithm. You do not need to train a machine learning model for the prototype.

## **14. Search and advanced filters**

**Requirement ID: FR-10**

The search engine should support keywords and filters including category, interests, city, distance where available, online or physical format, date, deadline, eligibility, cost, funding, verification status, group size, gender-specific participation and social interaction level.

Users should be able to sort by relevance, newest listings, nearest deadline and upcoming date.

## **15. Notification system**

**Requirement ID: FR-11**

Two notification channels will be supported: in-app notifications and email notifications.

| Trigger                         | Notification               |
| ------------------------------- | -------------------------- |
| Matching opportunity published  | New opportunity alert      |
| Saved deadline approaching      | Deadline reminder          |
| Submission approved or rejected | Verification update        |
| Activity join request accepted  | Participation confirmation |
| New planning poll               | Voting reminder            |
| Activity finalised              | Confirmed arrangements     |
| Activity changed or cancelled   | Important update           |
| New group message               | Discussion notification    |
| Identity verification updated   | Account notification       |

Users should be able to customise their notification categories and frequency.

# **Part IV — Privacy, security and safety**

## **16. Identity and account privacy**

**Requirement ID: FR-12**

The platform will use a pseudonymous participation model.

This means the platform can verify a person's identity privately without requiring them to reveal their real name publicly.

| Public information | Private information           |
| ------------------ | ----------------------------- |
| Username           | Legal name                    |
| Optional avatar    | Email address                 |
| Selected interests | Date of birth                 |
| Optional bio       | Identity verification details |
| Verification badge | Sensitive account information |

For the prototype, identity verification should be simulated.

For production, use an appropriate identity verification provider with consent, limited data retention and restricted access. Avoid storing raw CNIC photographs in the application's ordinary database.

## **17. Community safety**

**Requirement ID: FR-13**

The safety system should include reporting and blocking, women-only activities, moderated activity submissions, participant limits, public venue requirements for initial meetups, account suspension and feedback reporting.

Private messaging should be restricted to verified participants of a shared activity, require consent and support blocking and reporting.

A verified identity must not be presented as a guarantee that someone is safe.

## **18. Administrator dashboard**

**Requirement ID: FR-14**

The administrator should be able to manage the entire platform through a separate protected dashboard.

## **Administration**

Illustrative platform statistics

# **1,248**

Registered users

# **326**

Published opportunities

# **18**

Pending submissions

# **7**

Open reports

**Management modules**

Opportunity verification

Organisation verification

Identity verification status

Activity moderation

Reports and complaints

User management

Platform analytics

Administrative actions should be recorded in an audit log.

# **Part V — Technical architecture**

## **19. Recommended technology stack**

Since you will be vibecoding the entire project, I recommend a modern stack that reduces the amount of backend infrastructure you have to configure yourself.

[image](https://www.google.com/s2/favicons?domain=https://react.dev\&sz=32)

**React + TypeScript**

Frontend and application logic

[image](https://www.google.com/s2/favicons?domain=https://vite.dev\&sz=32)

**Vite**

Development server and build system

[image](https://www.google.com/s2/favicons?domain=https://tailwindcss.com\&sz=32)

**Tailwind CSS**

Responsive styling

[image](https://www.google.com/s2/favicons?domain=https://ui.shadcn.com\&sz=32)

**shadcn/ui**

Reusable interface components

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

**Supabase**

PostgreSQL database, authentication, storage and realtime

[image](https://www.google.com/s2/favicons?domain=https://ai.google.dev\&sz=32)

**Gemini API or OpenAI API**

AI-assisted opportunity verification

[image](https://www.google.com/s2/favicons?domain=https://resend.com\&sz=32)

**Resend**

Email notifications

[image](https://www.google.com/s2/favicons?domain=https://leafletjs.com\&sz=32)

**Leaflet + OpenStreetMap**

Location-based experience discovery

[image](https://www.google.com/s2/favicons?domain=https://vercel.com\&sz=32)

**Vercel**

Frontend deployment

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

**GitHub**

Version control and public repository

This is a recommended stack, not a mandatory one. I selected it because Supabase can handle authentication, relational data, access permissions and realtime discussions without requiring you to develop a separate PHP backend.

AI API usage and email delivery may require API credentials, quotas or paid services depending on the providers selected.

## **20. System architecture**

\#chatgpt-mermaid-\_r_1h0\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1h0\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1h0\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1h0\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1h0\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1h0\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1h0\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1h0\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1h0\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1h0\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1h0\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1h0\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1h0\_ p{margin:0;}#chatgpt-mermaid-\_r_1h0\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1h0\_ .label text,#chatgpt-mermaid-\_r_1h0\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ .node rect,#chatgpt-mermaid-\_r_1h0\_ .node circle,#chatgpt-mermaid-\_r_1h0\_ .node ellipse,#chatgpt-mermaid-\_r_1h0\_ .node polygon,#chatgpt-mermaid-\_r_1h0\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .rough-node .label text,#chatgpt-mermaid-\_r_1h0\_ .node .label text,#chatgpt-mermaid-\_r_1h0\_ .image-shape .label,#chatgpt-mermaid-\_r_1h0\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1h0\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .rough-node .label,#chatgpt-mermaid-\_r_1h0\_ .node .label,#chatgpt-mermaid-\_r_1h0\_ .image-shape .label,#chatgpt-mermaid-\_r_1h0\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1h0\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1h0\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1h0\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1h0\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1h0\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1h0\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1h0\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1h0\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1h0\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1h0\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1h0\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1h0\_ .icon-shape,#chatgpt-mermaid-\_r_1h0\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1h0\_ .icon-shape p,#chatgpt-mermaid-\_r_1h0\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1h0\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1h0\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1h0\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1h0\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1h0\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1h0\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1h0\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1h0\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1h0\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1h0\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1h0\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1h0\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1h0\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1h0\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1h0\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1h0\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .node rect,#chatgpt-mermaid-\_r_1h0\_ .node circle,#chatgpt-mermaid-\_r_1h0\_ .node ellipse,#chatgpt-mermaid-\_r_1h0\_ .node polygon,#chatgpt-mermaid-\_r_1h0\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1h0\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1h0\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1h0\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1h0\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1h0\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Responsive React WebsiteSupabase AuthenticationApplication ServicesPostgreSQL DatabaseRealtime DiscussionsImage StorageServer-side FunctionsAI Verification APIEmail ServiceMap InterfaceAdmin Dashboard

Sensitive API keys must remain in server-side functions. They should never be exposed in the frontend or committed to the public GitHub repository.

## **21. Database structure**

Your application will need approximately the following database tables.

| Table                    | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| profiles                 | User profile information                   |
| user_preferences         | Social comfort, location and budget        |
| interests                | Available interest categories              |
| user_interests           | User-interest relationships                |
| organisations            | Organisation accounts                      |
| opportunities            | Opportunity listings                       |
| opportunity_tags         | Opportunity-interest relationships         |
| verification_reviews     | AI and administrator reviews               |
| saved_opportunities      | User bookmarks                             |
| applications             | Application tracking                       |
| reminders                | Deadline and personal reminders            |
| solo_experiences         | Independent activity recommendations       |
| activities               | Proposed group experiences                 |
| activity_participants    | Activity memberships                       |
| activity_messages        | Planning room discussions                  |
| polls                    | Planning polls                             |
| poll_options             | Available voting options                   |
| poll_votes               | Participant votes                          |
| activity_feedback        | Post-activity feedback                     |
| notifications            | In-app notifications                       |
| notification_preferences | User notification settings                 |
| identity_verifications   | Verification status and provider reference |
| reports                  | Safety and content reports                 |
| blocked_users            | User blocking relationships                |
| admin_audit_logs         | Administrative action history              |

The coding agent should create database migrations, relationships, constraints, indexes and Row Level Security policies.

## **22. Non-functional requirements**

| Requirement     | Expected behaviour                                           |
| --------------- | ------------------------------------------------------------ |
| Responsiveness  | Works on mobile, tablet and desktop                          |
| Accessibility   | Keyboard navigation, readable contrast and labelled controls |
| Performance     | Efficient queries, pagination and optimised images           |
| Security        | Role-based permissions and server-side validation            |
| Reliability     | Clear loading, empty and error states                        |
| Maintainability | Modular components and organised code                        |
| Privacy         | Minimal collection of personal information                   |
| Scalability     | Supports increasing users and listings                       |
| Data integrity  | Prevents duplicate votes and invalid memberships             |
| Usability       | Simple navigation and consistent interface                   |

# **Part VI — Website structure and design**

## **23. Navigation structure**

I recommend keeping the main navigation simple despite the large number of features.

### **Main navigation**

Home

Opportunities

Experiences

Community

My Calendar

Saved

My Applications

Notifications

Settings

**Create menu**

Submit an opportunityRecommend an experiencePropose an activity

**Profile menu**

My profilePreferencesIdentity verificationPrivacy and safetyHelp and support

## **24. Visual design direction**

I would avoid making the website look like a corporate job portal or a conventional social media application.

[The Generation | Opportunity Database](https://images.openai.com/static-rsc-4/zhJ3melCVAxySlPmLa87EM-AYIoSLI4mUr_wXr0aCiZaYMpUoeczf7PdEh1qVHgFk48GJl3OquHRV019AVirWnFxRZa3IsUVNVPWSqEFa98bgrb6ZInD0gDih8EHe6gTQDSI3lVQ6TI0iKT48vgewaKRK3zJqBy1NHO70D64J10?purpose=inline)

[Craft — Courtney Kim](https://images.openai.com/static-rsc-4/Iq1L6Tl3myum5W2l3Fip-VOOlQ_OyLHSSwKFJxQ4zlw_fSbqh8QK_tDOS61ZvSfEiqbjgoymTCdyRuZ218Dpf6ANq0_KU4pVSMTNGPZ3XFGjjZkN-pywQLDL-9Jw7FdVquPUXpOUIQDC-FnT-7T8hKcByMrz-HpAwJHkIl-dxG4?purpose=inline)

[Watrip – Trip Mobile App by Budiarti R.  on Dribbble](https://images.openai.com/static-rsc-4/ABS76dm-eZ1A0f1oIrG9uR1KxA1vpyqGLE3sExXIJGOGTFGKL3Tnh94pnplJAejkv2PxI4FOXhU8Bt2QLFXAJb_VKcBTu_ZiEgFQq1_I3RqNgPZEg0fDMAR2zxNKUUzG6FxH0FApg8wAGgnZxDH0mVF3DgPgMrOjLO9PMIt1x2g?purpose=inline)

12

The interface should feel calm, youthful, exploratory and welcoming.

Cream

\#F8F6F0

Lavender

\#DED8F3

Purple

\#8272B5

Sage

\#B5C8B2

Charcoal

\#292B35

Suggested typography: Plus Jakarta Sans or Manrope for headings, Inter for body text.

This is a proposed design direction. We can change the visual identity once the project name and branding are finalised.

# **Part VII — Development roadmap**

## **25. Development phases**

**Do not give your AI coding agent all the requirements and ask it to build everything in one go.** With an application of this size, that approach can produce inconsistent database structures, broken permissions and features that look functional but aren't.

Build it module by module.

### **01**

**Project foundation**

Project setup, database schema, authentication, layouts, design system and role-based access.

Deliverable: Working application foundation

### **02**

**Onboarding and dashboard**

User preferences, interests, recommendation algorithm and personalised dashboard.

Deliverable: Personalised user experience

### **03**

**Opportunity discovery**

Listings, categories, filters, saved items, submission forms and organisation accounts.

Deliverable: Complete opportunity directory

### **04**

**Verification system**

Admin moderation, AI analysis, approval workflow, source checking and duplicate detection.

Deliverable: Verified opportunity workflow

### **05**

**Application management**

Application tracker, personal calendar, reminders and notification preferences.

Deliverable: Opportunity management system

### **06**

**Solo experiences**

Experience discovery, community recommendations, moderation and location filters.

Deliverable: Independent experience directory

### **07**

**Shared hobbies and planning**

Activity creation, join requests, realtime discussions, polls, finalisation and feedback.

Deliverable: Complete collaborative activity workflow

### **08**

**Privacy and safety**

Identity verification simulation, reporting, blocking, restricted messaging and safety controls.

Deliverable: Moderated participation system

### **09**

**Integration and testing**

Email delivery, scheduled reminders, permissions testing, responsiveness and bug fixing.

Deliverable: Integrated working prototype

### **10**

**Deployment and presentation**

Public deployment, GitHub documentation, fictional demo data, demo accounts and pitch preparation.

Deliverable: Hackathon-ready product

## **26. Development priority matrix**

All your selected features remain in scope. The priorities only determine their implementation order and how sophisticated each feature needs to be for the hackathon.

| Feature                      | Priority | Prototype implementation    |
| ---------------------------- | -------- | --------------------------- |
| Authentication               | P0       | Fully functional            |
| Personalised onboarding      | P0       | Fully functional            |
| Recommendation engine        | P0       | Rule-based                  |
| Opportunity discovery        | P0       | Fully functional            |
| Community submissions        | P0       | Fully functional            |
| Admin verification           | P0       | Fully functional            |
| Solo experiences             | P0       | Fully functional            |
| Shared activities            | P0       | Fully functional            |
| Collaborative voting         | P0       | Fully functional            |
| Planning discussions         | P0       | Realtime                    |
| AI-assisted fact-checking    | P1       | Functional with limitations |
| Application tracker          | P1       | Fully functional            |
| Calendar                     | P1       | Fully functional            |
| Deadline reminders           | P1       | Scheduled notifications     |
| Organisation accounts        | P1       | Admin-approved              |
| Reporting and blocking       | P1       | Fully functional            |
| Women-only activities        | P1       | Participation controls      |
| Activity feedback            | P1       | Fully functional            |
| Location discovery           | P1       | City and map-based          |
| Email notifications          | P1       | Integrated email service    |
| Identity verification        | P2       | Simulated                   |
| Restricted private messaging | P2       | Consent-based               |

P0 represents essential product functionality, P1 represents supporting functionality, and P2 represents features that require additional privacy or implementation considerations.

## **27. Testing and acceptance checklist**

This is the minimum testing checklist before considering the prototype complete.

### **Prototype readiness**

0/25

**Account and personalisation**

A new user can register and log in.

Onboarding preferences persist after logout.

Different preferences produce different recommendations.

**Opportunity discovery**

Users can search and filter opportunities.

Users can submit opportunities for review.

Administrators can approve and reject submissions.

AI analysis reports missing evidence without inventing facts.

Users can save and track applications.

Expired opportunities are correctly identified.

**Experiences and activities**

Users can submit solo experiences.

Users can propose and join group activities.

Participants can create polls and vote once per poll.

Group discussions update correctly.

Activities can be confirmed, cancelled and completed.

Participants can submit feedback.

**Privacy and safety**

Private account information is not publicly accessible.

Unauthorised users cannot access admin pages or private discussions.

Blocked users cannot send private messages.

Users can report suspicious content.

Women-only participation rules are enforced appropriately.

**Deployment**

The website works on mobile and desktop.

Email notifications are tested.

No secret API keys appear in GitHub.

The deployed application works with its production database.

Demo accounts and fictional sample data are available.

# **Part VIII — Business and hackathon strategy**

## **28. Proposed business model**

The platform should be free for ordinary users.

| Revenue stream             | Description                                       |
| -------------------------- | ------------------------------------------------- |
| Organisation subscriptions | Advanced listing management and analytics         |
| Sponsored opportunities    | Clearly labelled promoted listings                |
| University partnerships    | Dedicated opportunity portals for institutions    |
| Event promotion            | Paid promotion of relevant verified events        |
| Experience partnerships    | Collaborations with workshops and activity venues |

Payment should never allow an organisation to bypass verification or moderation.

## **29. Competitive advantage**

Your competitive advantage should not simply be the number of features.

| Conventional platforms                   | Your platform                       |
| ---------------------------------------- | ----------------------------------- |
| Opportunities scattered across platforms | Centralised discovery               |
| Networking-focused                       | Experience-focused                  |
| Fixed personality assumptions            | Flexible social comfort preferences |
| Individual event organisers              | Collaborative planning              |
| Public professional identities           | Pseudonymous participation          |
| Manual deadline management               | Integrated application tracking     |
| Unverified community posts               | AI-assisted human verification      |

These are intended differentiators, not claims that no competitor offers similar features.

## **30. Hackathon demonstration storyline**

Rather than showing every page individually, demonstrate a complete user journey.

1. A university student registers and selects their interests and social preferences.
2. The dashboard recommends relevant scholarships, hackathons and experiences.
3. The student saves a scholarship and receives an upcoming deadline reminder.
4. They discover a solo experience that suits their preferences.
5. They propose a quiet sketching activity.
6. Other participants join and collaboratively vote on the venue and time.
7. The activity is confirmed without requiring traditional networking.
8. Switch to the administrator account and demonstrate AI-assisted opportunity verification.

This storyline demonstrates the entire purpose of the product, rather than presenting a collection of unrelated features.

# **Part IX — Decisions before development**

The requirements are now defined. However, there are a few product decisions that should be finalised before we generate the actual vibecoding prompts.

## **Final product configuration**

Project name

Geographical scope

Karachi only

Pakistan-wide opportunities, Karachi-based experiences

Pakistan-wide platform

International opportunities, Pakistan-based experiences

Visual identity

Calm editorial — lavender, cream and sage

Modern and vibrant — bold youthful colours

Minimal premium — neutral monochrome

Warm and playful — pastel colours

Which AI coding environment will you use?

Google Antigravity

Cursor

VS Code with GitHub Copilot

Claude Code

Lovable

Replit

Not decided

Anything else you want to add or change?

Finalise product and prepare development prompts

**My recommended next step is to finalise the product name and visual identity, then create a master specification file for your AI coding agent.** That file will remain the source of truth throughout development so that every module follows the same requirements, database structure and design language.

The proposed technology stack, recommendation weights, branding, business model and implementation priorities are decisions I've suggested rather than decisions you've explicitly approved. The actual feasibility of identity verification, AI fact-checking and email delivery will also depend on the external services we choose. Everything else incorporates your selected feature requirements.
