//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'report_child_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ReportChildDto {
  /// Returns a new [ReportChildDto] instance.
  ReportChildDto({
    required this.childId,

    required this.nickname,

    required this.avatarKey,

    required this.minutes,

    required this.xp,

    required this.lessons,

    required this.projects,

    required this.badges,

    required this.streak,

    required this.league,

    required this.skills,

    required this.days,
  });

  @JsonKey(name: r'childId', required: true, includeIfNull: false)
  final String childId;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  /// Minutes spent learning (from the apps, while the student works).
  @JsonKey(name: r'minutes', required: true, includeIfNull: false)
  final num minutes;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'lessons', required: true, includeIfNull: false)
  final num lessons;

  @JsonKey(name: r'projects', required: true, includeIfNull: false)
  final num projects;

  @JsonKey(name: r'badges', required: true, includeIfNull: false)
  final num badges;

  /// The streak at the end of the week.
  @JsonKey(name: r'streak', required: true, includeIfNull: false)
  final num streak;

  /// The league they finished the week in (e.g. \"silver\").
  @JsonKey(name: r'league', required: true, includeIfNull: false)
  final String league;

  /// Skills learned this week (keys; names come with the report in its language).
  @JsonKey(name: r'skills', required: true, includeIfNull: false)
  final List<String> skills;

  /// Minutes on each day of the week, Monday first.
  @JsonKey(name: r'days', required: true, includeIfNull: false)
  final List<num> days;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportChildDto &&
          other.childId == childId &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.minutes == minutes &&
          other.xp == xp &&
          other.lessons == lessons &&
          other.projects == projects &&
          other.badges == badges &&
          other.streak == streak &&
          other.league == league &&
          other.skills == skills &&
          other.days == days;

  @override
  int get hashCode =>
      childId.hashCode +
      nickname.hashCode +
      avatarKey.hashCode +
      minutes.hashCode +
      xp.hashCode +
      lessons.hashCode +
      projects.hashCode +
      badges.hashCode +
      streak.hashCode +
      league.hashCode +
      skills.hashCode +
      days.hashCode;

  factory ReportChildDto.fromJson(Map<String, dynamic> json) =>
      _$ReportChildDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ReportChildDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
