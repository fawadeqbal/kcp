import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';

/// The student's skill map.
final skillMapProvider = FutureProvider.autoDispose<SkillMapDto>((ref) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  return (await api.getReportsApi().reportsSkills(lang: lang)).data!;
});

/// A child's skill map, for their parent.
final childSkillMapProvider = FutureProvider.autoDispose.family<SkillMapDto, String>((
  ref,
  childId,
) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  return (await api.getReportsApi().reportsChildSkills(id: childId, lang: lang)).data!;
});

/// The parent's weekly reports, newest first.
final parentReportsProvider = FutureProvider.autoDispose<List<ParentReportDto>>((ref) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  return (await api.getReportsApi().reportsList(lang: lang)).data!.reports;
});

String skillCategoryName(AppLocalizations t, String key) => switch (key) {
  'web' => t.skillCategoryWeb,
  'python' => t.skillCategoryPython,
  'teamwork' => t.skillCategoryTeamwork,
  _ => t.skillCategoryLogic,
};

/// Skills by group, learned ones ticked (the "Me" tab, and a child's screen).
class SkillMapCard extends StatelessWidget {
  const SkillMapCard({super.key, required this.map, required this.title});

  final SkillMapDto map;
  final String title;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(title, style: theme.textTheme.titleMedium)),
          Text(
            t.skillsCount(map.learned.toInt(), map.total.toInt()),
            style: theme.textTheme.bodySmall,
          ),
          for (final category in map.categories) ...[
            const SizedBox(height: 12),
            Text(skillCategoryName(t, category.key.value), style: theme.textTheme.titleSmall),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final skill in category.skills)
                  KcpPill(
                    icon: skill.learned ? 'check' : 'lock',
                    label: skill.name,
                    semanticLabel:
                        '${skill.name}: ${skill.learned ? t.skillLearned : t.skillNotYet}',
                    background: skill.learned ? p.sage100 : p.sand200,
                    color: skill.learned ? p.sage800 : p.muted,
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The latest weekly report on the parent's home: each child's minutes, lessons and
/// new skills (the full report is on the website).
class WeeklyReportCard extends ConsumerWidget {
  const WeeklyReportCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final reports = ref.watch(parentReportsProvider).value;
    if (reports == null || reports.isEmpty) return const SizedBox.shrink();
    final report = reports.first;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.reportThisWeek, style: theme.textTheme.titleLarge),
            ),
            for (final child in report.children) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  KcpAvatar(child.avatarKey, size: 36),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(child.nickname, style: theme.textTheme.titleSmall),
                        Text(
                          [
                            t.reportMinutes(child.minutes.toInt()),
                            t.xpTotal(child.xp.toInt()),
                            t.reportLessons(child.lessons.toInt()),
                          ].join(' · '),
                          style: theme.textTheme.bodySmall,
                        ),
                        if (child.skills.isNotEmpty)
                          Text(
                            t.reportNewSkills(
                              child.skills.map((k) => report.skillNames[k] ?? k).join(', '),
                            ),
                            style: theme.textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
