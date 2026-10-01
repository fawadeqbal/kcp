//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/child_consents_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'child_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChildDto {
  /// Returns a new [ChildDto] instance.
  ChildDto({
    required this.id,

    required this.username,

    required this.nickname,

    required this.avatarKey,

    required this.birthYear,

    required this.languageCode,

    required this.countryCode,

    required this.regionId,

    required this.cityId,

    required this.status,

    required this.hasPicturePassword,

    required this.consents,

    required this.createdAt,

    required this.lastLoginAt,

    required this.lessonsCompleted,

    required this.premiumUntil,

    required this.premiumSource,

    required this.trialEndsAt,

    required this.xpTotal,

    required this.level,

    required this.streak,

    required this.badges,

    required this.streakReminders,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// The child's login name.
  @JsonKey(name: r'username', required: true, includeIfNull: false)
  final String username;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  @JsonKey(name: r'birthYear', required: true, includeIfNull: false)
  final num birthYear;

  @JsonKey(name: r'languageCode', required: true, includeIfNull: false)
  final String languageCode;

  @JsonKey(name: r'countryCode', required: true, includeIfNull: true)
  final String? countryCode;

  @JsonKey(name: r'regionId', required: true, includeIfNull: true)
  final String? regionId;

  @JsonKey(name: r'cityId', required: true, includeIfNull: true)
  final String? cityId;

  /// PENDING_CONSENT: under 13 and waiting for the parent's verified consent.
  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ChildDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ChildDtoStatusEnum status;

  /// The child can sign in with a picture password (set by the parent).
  @JsonKey(name: r'hasPicturePassword', required: true, includeIfNull: false)
  final bool hasPicturePassword;

  @JsonKey(name: r'consents', required: true, includeIfNull: false)
  final ChildConsentsDto consents;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @JsonKey(name: r'lastLoginAt', required: true, includeIfNull: true)
  final DateTime? lastLoginAt;

  /// Lessons the child has completed.
  @JsonKey(name: r'lessonsCompleted', required: true, includeIfNull: false)
  final num lessonsCompleted;

  /// When today's premium ends (a plan renews on its own); null without premium.
  @JsonKey(name: r'premiumUntil', required: true, includeIfNull: true)
  final DateTime? premiumUntil;

  /// Where premium comes from: the family's plan, our team, or the free trial.
  @JsonKey(
    name: r'premiumSource',
    required: true,
    includeIfNull: true,
    unknownEnumValue: ChildDtoPremiumSourceEnum.unknownDefaultOpenApi,
  )
  final ChildDtoPremiumSourceEnum? premiumSource;

  /// The child's free trial (over or not).
  @JsonKey(name: r'trialEndsAt', required: true, includeIfNull: true)
  final DateTime? trialEndsAt;

  /// All XP earned so far.
  @JsonKey(name: r'xpTotal', required: true, includeIfNull: false)
  final num xpTotal;

  @JsonKey(name: r'level', required: true, includeIfNull: false)
  final num level;

  /// Days in a row with the daily goal met (0 once a day is missed).
  @JsonKey(name: r'streak', required: true, includeIfNull: false)
  final num streak;

  /// Badges earned.
  @JsonKey(name: r'badges', required: true, includeIfNull: false)
  final num badges;

  /// Evening reminders in the mobile app when the streak is about to end.
  @JsonKey(name: r'streakReminders', required: true, includeIfNull: false)
  final bool streakReminders;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChildDto &&
          other.id == id &&
          other.username == username &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.birthYear == birthYear &&
          other.languageCode == languageCode &&
          other.countryCode == countryCode &&
          other.regionId == regionId &&
          other.cityId == cityId &&
          other.status == status &&
          other.hasPicturePassword == hasPicturePassword &&
          other.consents == consents &&
          other.createdAt == createdAt &&
          other.lastLoginAt == lastLoginAt &&
          other.lessonsCompleted == lessonsCompleted &&
          other.premiumUntil == premiumUntil &&
          other.premiumSource == premiumSource &&
          other.trialEndsAt == trialEndsAt &&
          other.xpTotal == xpTotal &&
          other.level == level &&
          other.streak == streak &&
          other.badges == badges &&
          other.streakReminders == streakReminders;

  @override
  int get hashCode =>
      id.hashCode +
      username.hashCode +
      nickname.hashCode +
      avatarKey.hashCode +
      birthYear.hashCode +
      languageCode.hashCode +
      (countryCode == null ? 0 : countryCode.hashCode) +
      (regionId == null ? 0 : regionId.hashCode) +
      (cityId == null ? 0 : cityId.hashCode) +
      status.hashCode +
      hasPicturePassword.hashCode +
      consents.hashCode +
      createdAt.hashCode +
      (lastLoginAt == null ? 0 : lastLoginAt.hashCode) +
      lessonsCompleted.hashCode +
      (premiumUntil == null ? 0 : premiumUntil.hashCode) +
      (premiumSource == null ? 0 : premiumSource.hashCode) +
      (trialEndsAt == null ? 0 : trialEndsAt.hashCode) +
      xpTotal.hashCode +
      level.hashCode +
      streak.hashCode +
      badges.hashCode +
      streakReminders.hashCode;

  factory ChildDto.fromJson(Map<String, dynamic> json) =>
      _$ChildDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChildDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// PENDING_CONSENT: under 13 and waiting for the parent's verified consent.
enum ChildDtoStatusEnum {
  @JsonValue(r'PENDING_VERIFICATION')
  PENDING_VERIFICATION(r'PENDING_VERIFICATION'),
  @JsonValue(r'ACTIVE')
  ACTIVE(r'ACTIVE'),
  @JsonValue(r'SUSPENDED')
  SUSPENDED(r'SUSPENDED'),
  @JsonValue(r'DELETED')
  DELETED(r'DELETED'),
  @JsonValue(r'PENDING_CONSENT')
  PENDING_CONSENT(r'PENDING_CONSENT'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ChildDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// Where premium comes from: the family's plan, our team, or the free trial.
enum ChildDtoPremiumSourceEnum {
  @JsonValue(r'subscription')
  subscription(r'subscription'),
  @JsonValue(r'grant')
  grant(r'grant'),
  @JsonValue(r'trial')
  trial(r'trial'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ChildDtoPremiumSourceEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
