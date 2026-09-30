# KCP Demo Data Reference

## Quick Start Commands

```bash
pnpm db:generate
pnpm install
pnpm db:deploy
pnpm build
pnpm content:import
pnpm dev
```

---

## Staff Accounts

> Admin panel: **http://localhost:3002** (two-factor login is set up on first use)

| Email | Role | Password |
|---|---|---|
| superadmin@kcp-demo.test | Super Admin | `demo staff password` |
| admin@kcp-demo.test | Admin | `demo staff password` |
| moderator@kcp-demo.test | Moderator | `demo staff password` |
| content@kcp-demo.test | Content Creator | `demo staff password` |

---

## Parent & Child Accounts

> **Parents** log in at: **http://localhost:3001/en/login** — password: `demo password 123`
>
> **Children** log in at: **http://localhost:3001/en/login/student** — password: `kid pass 42`

---

### Simple Demo Families

| Parent Email | Country | Lang | Plan |
|---|---|---|---|
| parent.en@demo.test | — | en | — |
| parent.ar@demo.test | — | ar | — |
| parent.ur@demo.test | — | ur | — |

| Child Display Name | Handle | Parent | Level | XP | Streak | Notes |
|---|---|---|---|---|---|---|
| CometCoder | atomic-phoenix-8528 | parent.en@demo.test | — | 200 | — | 2 lessons done, next started |
| PixelPanda | atomic-owl-6039 | parent.en@demo.test | — | 0 | — | new |
| StarBuilder | ninja-yak-4597 | parent.ar@demo.test | — | 40 | — | 1 lesson done |
| MoonMaker | brave-eagle-7195 | parent.ur@demo.test | — | 0 | — | new |

---

### Full Demo Families

| # | Parent Email | Country | Lang | Plan | Status |
|---|---|---|---|---|---|
| 1 | omer.hayat@kcp-demo.test | PK | en | card monthly | active |
| 2 | imran.qureshi@kcp-demo.test | PK | ur | card yearly | active |
| 3 | nabeel.akhtar@kcp-demo.test | PK | en | card monthly | active |
| 4 | samina.yousaf@kcp-demo.test | PK | ur | no plan | — |
| 5 | mona.adel@kcp-demo.test | EG | ar | card monthly | active |
| 6 | sana.malik@kcp-demo.test | PK | en | card monthly | active |
| 7 | maria.fernandes@kcp-demo.test | PK | en | card monthly | active |
| 8 | asad.mirza@kcp-demo.test | PK | en | card monthly | canceled |
| 9 | dina.magdy@kcp-demo.test | EG | ar | manual monthly | active |
| 10 | tarek.hassan@kcp-demo.test | EG | ar | card yearly | active |
| 11 | adeel.malik@kcp-demo.test | PK | en | no plan | — |
| 12 | kamran.javed@kcp-demo.test | PK | ur | no plan | — |
| 13 | heba.samir@kcp-demo.test | EG | ar | no plan | — |
| 14 | ayesha.raza@kcp-demo.test | PK | en | no plan | — |
| 15 | saad.iqbal@kcp-demo.test | PK | ur | manual monthly | canceled |
| 16 | hina.butt@kcp-demo.test | PK | ur | manual monthly | active |
| 17 | areeba.hussain@kcp-demo.test | PK | en | no plan | — |
| 18 | mahmoud.saeed@kcp-demo.test | EG | ar | no plan | — |
| 19 | nadia.aslam@kcp-demo.test | PK | en | card monthly | active (cancelling) |
| 20 | adnan.latif@kcp-demo.test | PK | ur | manual monthly | canceled |
| 21 | farhan.sheikh@kcp-demo.test | PK | en | card monthly | past due |
| 22 | rabia.khalid@kcp-demo.test | PK | en | no plan | — |
| 23 | karim.mostafa@kcp-demo.test | EG | ar | manual monthly | active |
| 24 | rania.lotfy@kcp-demo.test | EG | ar | card monthly | active |
| 25 | owais.memon@kcp-demo.test | PK | ur | no plan | — |
| 26 | bilal.chaudhry@kcp-demo.test | PK | ur | manual monthly | active |
| 27 | sadia.baig@kcp-demo.test | PK | en | card yearly | active |
| 28 | faisal.khan@kcp-demo.test | PK | ur | no plan | — |
| 29 | mehwish.anwar@kcp-demo.test | PK | en | card monthly | active |
| 30 | laila.gamal@kcp-demo.test | EG | en | no plan | — |
| 31 | shazia.parveen@kcp-demo.test | PK | ur | no plan | — |
| 32 | yasmin.fathy@kcp-demo.test | EG | en | no plan | — |
| 33 | hamza.siddiqui@kcp-demo.test | PK | en | no plan | — |
| 34 | junaid.shah@kcp-demo.test | PK | ur | no plan | — |
| 35 | gul.khan@kcp-demo.test | PK | ur | no plan | — |
| 36 | ahmed.zaki@kcp-demo.test | EG | en | no plan | — |
| 37 | tahir.abbas@kcp-demo.test | PK | en | no plan | — |
| 38 | irfan.haider@kcp-demo.test | PK | en | no plan | — |
| 39 | sobia.rafiq@kcp-demo.test | PK | ur | no plan | — |
| 40 | sherif.nabil@kcp-demo.test | EG | ar | no plan | — |
| 41 | waqas.ahmed@kcp-demo.test | PK | en | no plan | — |
| 42 | hassan.raza@kcp-demo.test | PK | en | — | email not confirmed |
| 43 | zainab.tariq@kcp-demo.test | PK | en | no plan | — |
| 44 | usman.ghani@kcp-demo.test | PK | ur | no plan | — |
| 45 | amna.saleem@kcp-demo.test | PK | ur | no plan | — |
| 46 | fatima.noor@kcp-demo.test | PK | ur | no plan | — |

---

### All Children

| Username | Handle | Parent Email | Level | XP | Streak | City | Notes |
|---|---|---|---|---|---|---|---|
| FearlessJaguar55 | epic-gecko-7919 | omer.hayat@kcp-demo.test | 7 | 1660 | 37 | islamabad | |
| NimbleHawk | super-jaguar-1264 | omer.hayat@kcp-demo.test | 5 | 920 | 2 | islamabad | |
| CrystalBeetle | ninja-dragon-8842 | imran.qureshi@kcp-demo.test | 7 | 1635 | 3 | lahore | |
| QuantumDolphin65 | ultimate-falcon-5618 | nabeel.akhtar@kcp-demo.test | 7 | 1600 | 8 | rawalpindi | |
| FrostyViking66 | jolly-tiger-6970 | samina.yousaf@kcp-demo.test | 3 | 445 | 0 | islamabad | **suspended** |
| AtomicNebula | sonic-yak-5467 | mona.adel@kcp-demo.test | 7 | 1560 | 3 | cairo | |
| StellarRaven14 | zippy-viking-9624 | mona.adel@kcp-demo.test | 6 | 1025 | 2 | cairo | |
| BlazingPanther20 | super-raven-3625 | sana.malik@kcp-demo.test | 7 | 1625 | 9 | lahore | |
| NimbleEagle68 | zippy-unicorn-4163 | sana.malik@kcp-demo.test | 6 | 1180 | 1 | lahore | |
| CleverTurtle | nimble-shark-3344 | maria.fernandes@kcp-demo.test | 7 | 1590 | 3 | karachi | **15 XP removed** |
| MagicComet68 | nimble-comet-6753 | maria.fernandes@kcp-demo.test | 6 | 1200 | 1 | karachi | |
| RapidDolphin52 | blazing-quasar-6474 | asad.mirza@kcp-demo.test | 3 | 430 | 0 | lahore | |
| CosmicBeetle | super-whale-5558 | dina.magdy@kcp-demo.test | 7 | 1655 | 9 | alexandria | |
| StellarZebra65 | ultimate-dragon-1811 | tarek.hassan@kcp-demo.test | 7 | 1590 | 3 | cairo | |
| StellarDragon | curious-octopus-9857 | kamran.javed@kcp-demo.test | 3 | 280 | 0 | lahore | |
| CrystalRocket | lunar-gecko-4787 | kamran.javed@kcp-demo.test | 1 | 0 | 0 | lahore | |
| FearlessDragon | sonic-panda-8767 | heba.samir@kcp-demo.test | 3 | 265 | 0 | cairo | |
| SonicOwl24 | electric-phoenix-9863 | heba.samir@kcp-demo.test | 4 | 645 | 0 | cairo | |
| VividUnicorn76 | stellar-lion-3996 | ayesha.raza@kcp-demo.test | 7 | 1540 | 3 | lahore | **"Helper" badge** |
| PixelLynx | atomic-phoenix-5265 | saad.iqbal@kcp-demo.test | 3 | 315 | 0 | lahore | |
| MagicNebula | swift-koala-2646 | hina.butt@kcp-demo.test | 6 | 1120 | 3 | lahore | |
| StellarWolf86 | fearless-robot-6230 | hina.butt@kcp-demo.test | 4 | 615 | 0 | lahore | |
| SwiftCheetah88 | nimble-sparrow-5843 | areeba.hussain@kcp-demo.test | 5 | 710 | 2 | karachi | |
| NimbleLynx26 | curious-hawk-3087 | mahmoud.saeed@kcp-demo.test | 4 | 535 | 1 | alexandria | |
| PixelTiger32 | magic-koala-5152 | mahmoud.saeed@kcp-demo.test | 2 | 190 | 0 | alexandria | |
| WildPenguin41 | neon-lynx-2218 | nadia.aslam@kcp-demo.test | 5 | 785 | 0 | lahore | |
| GalacticJaguar43 | mighty-eagle-2189 | adnan.latif@kcp-demo.test | 3 | 295 | 0 | faisalabad | |
| StellarOwl72 | mighty-lynx-1239 | farhan.sheikh@kcp-demo.test | 6 | 1015 | 3 | lahore | |
| FearlessCheetah | cosmic-lion-5735 | rabia.khalid@kcp-demo.test | 4 | 675 | 0 | lahore | |
| CleverRaven92 | super-shark-7284 | karim.mostafa@kcp-demo.test | 5 | 975 | 1 | cairo | |
| HyperComet93 | thunder-robot-1263 | rania.lotfy@kcp-demo.test | 5 | 800 | 0 | giza | |
| HyperHawk77 | crystal-unicorn-7711 | rania.lotfy@kcp-demo.test | 5 | 860 | 0 | giza | |
| TurboUnicorn | rapid-owl-9602 | owais.memon@kcp-demo.test | 4 | 625 | 0 | karachi | |
| AtomicCoder17 | polar-comet-3266 | bilal.chaudhry@kcp-demo.test | 5 | 710 | 2 | lahore | |
| BravePenguin55 | crystal-otter-7058 | sadia.baig@kcp-demo.test | 5 | 895 | 3 | karachi | |
| CleverRobot28 | blazing-panther-8534 | faisal.khan@kcp-demo.test | 5 | 740 | 2 | hyderabad | |
| UltimateOtter82 | rapid-raven-8940 | mehwish.anwar@kcp-demo.test | 4 | 660 | 0 | lahore | |
| PolarLion | ninja-octopus-5222 | mehwish.anwar@kcp-demo.test | 4 | 640 | 0 | lahore | |
| JollyMeteor14 | rapid-panda-5675 | mehwish.anwar@kcp-demo.test | 3 | 355 | 2 | lahore | |
| LunarDolphin50 | stellar-nebula-2899 | laila.gamal@kcp-demo.test | 4 | 630 | 2 | alexandria | |
| ZippyPenguin | ninja-penguin-1617 | shazia.parveen@kcp-demo.test | 1 | 0 | 0 | rawalpindi | |
| MagicEagle91 | orbital-sparrow-9193 | shazia.parveen@kcp-demo.test | 5 | 745 | 3 | rawalpindi | |
| LunarShark81 | blazing-comet-5913 | yasmin.fathy@kcp-demo.test | 4 | 470 | 0 | cairo | |
| NeonZebra79 | zippy-dolphin-6791 | yasmin.fathy@kcp-demo.test | 3 | 295 | 2 | cairo | |
| FrostyFox43 | solar-viking-6828 | hamza.siddiqui@kcp-demo.test | 3 | 295 | 0 | lahore | |
| NinjaQuasar48 | neon-rocket-1778 | junaid.shah@kcp-demo.test | 3 | 435 | 0 | karachi | |
| SonicBison33 | crystal-turtle-6396 | junaid.shah@kcp-demo.test | 3 | 260 | 5 | karachi | |
| SuperPanda59 | stellar-koala-4636 | gul.khan@kcp-demo.test | 4 | 485 | 1 | peshawar | |
| NeonRaven89 | ultimate-bison-6460 | ahmed.zaki@kcp-demo.test | 3 | 420 | 0 | giza | |
| SuperRobot12 | orbital-lion-6714 | ahmed.zaki@kcp-demo.test | 2 | 155 | 3 | giza | |
| DaringQuasar23 | golden-wolf-2210 | tahir.abbas@kcp-demo.test | 3 | 445 | 0 | lahore | |
| MagicBeetle67 | polar-cheetah-4115 | irfan.haider@kcp-demo.test | 4 | 545 | 1 | — | |
| VividNebula26 | blazing-comet-1374 | sobia.rafiq@kcp-demo.test | 1 | 0 | 0 | lahore | |
| StellarPenguin75 | clever-lion-6472 | sherif.nabil@kcp-demo.test | 1 | 0 | 0 | cairo | |
| BrightOctopus70 | neon-bison-1292 | waqas.ahmed@kcp-demo.test | 1 | 0 | 0 | islamabad | |
| MightyMeteor | lunar-yak-6050 | waqas.ahmed@kcp-demo.test | 3 | 350 | 7 | islamabad | |
| CrystalDragon99 | wild-falcon-4009 | zainab.tariq@kcp-demo.test | 1 | 50 | 0 | lahore | |
| FrostyBeetle90 | swift-quasar-9337 | usman.ghani@kcp-demo.test | 2 | 200 | 4 | lahore | |
| GalacticOctopus16 | atomic-viking-9833 | fatima.noor@kcp-demo.test | 2 | 115 | 2 | lahore | |

---

## Staff Actions to Review

| Action | Target |
|---|---|
| Account suspended | jolly-tiger-6970 (FrostyViking66) |
| 15 XP removed | nimble-shark-3344 (CleverTurtle) |
| "Helper" badge awarded | stellar-lion-3996 (VividUnicorn76) |
| Certificate revoked | KCP-JU8W-MTXR |

---

## Seasons & Leaderboards

| Season | Status |
|---|---|
| Pilot season 1 | Ended (final top 10s stored) |
| Autumn Code Cup | Running |

**Weeks closed with top 10s:** 9

**All 54 tables have rows.**
