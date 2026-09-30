//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'child_premium_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChildPremiumDto {
  /// Returns a new [ChildPremiumDto] instance.
  ChildPremiumDto({
    required this.id,

    required this.nickname,

    required this.avatarKey,

    required this.premium,

    required this.source_,

    required this.until,

    required this.trialEndsAt,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  @JsonKey(name: r'premium', required: true, includeIfNull: false)
  final bool premium;

  /// Where premium comes from now: the family plan, staff, or the free trial.
  @JsonKey(
    name: r'source',
    required: true,
    includeIfNull: true,
    unknownEnumValue: ChildPremiumDtoSource_Enum.unknownDefaultOpenApi,
  )
  final ChildPremiumDtoSource_Enum? source_;

  @JsonKey(name: r'until', required: true, includeIfNull: true)
  final DateTime? until;

  @JsonKey(name: r'trialEndsAt', required: true, includeIfNull: true)
  final DateTime? trialEndsAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChildPremiumDto &&
          other.id == id &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.premium == premium &&
          other.source_ == source_ &&
          other.until == until &&
          other.trialEndsAt == trialEndsAt;

  @override
  int get hashCode =>
      id.hashCode +
      nickname.hashCode +
      avatarKey.hashCode +
      premium.hashCode +
      (source_ == null ? 0 : source_.hashCode) +
      (until == null ? 0 : until.hashCode) +
      (trialEndsAt == null ? 0 : trialEndsAt.hashCode);

  factory ChildPremiumDto.fromJson(Map<String, dynamic> json) =>
      _$ChildPremiumDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChildPremiumDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// Where premium comes from now: the family plan, staff, or the free trial.
enum ChildPremiumDtoSource_Enum {
  @JsonValue(r'subscription')
  subscription(r'subscription'),
  @JsonValue(r'grant')
  grant(r'grant'),
  @JsonValue(r'trial')
  trial(r'trial'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ChildPremiumDtoSource_Enum(this.value);

  final String value;

  @override
  String toString() => value;
}
