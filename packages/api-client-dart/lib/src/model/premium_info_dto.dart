//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'premium_info_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PremiumInfoDto {
  /// Returns a new [PremiumInfoDto] instance.
  PremiumInfoDto({
    required this.active,

    required this.source_,

    required this.until,

    required this.trialEndsAt,
  });

  @JsonKey(name: r'active', required: true, includeIfNull: false)
  final bool active;

  /// subscription (the family's plan), grant (given by our team) or trial.
  @JsonKey(
    name: r'source',
    required: true,
    includeIfNull: true,
    unknownEnumValue: PremiumInfoDtoSource_Enum.unknownDefaultOpenApi,
  )
  final PremiumInfoDtoSource_Enum? source_;

  @JsonKey(name: r'until', required: true, includeIfNull: true)
  final DateTime? until;

  @JsonKey(name: r'trialEndsAt', required: true, includeIfNull: true)
  final DateTime? trialEndsAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PremiumInfoDto &&
          other.active == active &&
          other.source_ == source_ &&
          other.until == until &&
          other.trialEndsAt == trialEndsAt;

  @override
  int get hashCode =>
      active.hashCode +
      (source_ == null ? 0 : source_.hashCode) +
      (until == null ? 0 : until.hashCode) +
      (trialEndsAt == null ? 0 : trialEndsAt.hashCode);

  factory PremiumInfoDto.fromJson(Map<String, dynamic> json) =>
      _$PremiumInfoDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PremiumInfoDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// subscription (the family's plan), grant (given by our team) or trial.
enum PremiumInfoDtoSource_Enum {
  @JsonValue(r'subscription')
  subscription(r'subscription'),
  @JsonValue(r'grant')
  grant(r'grant'),
  @JsonValue(r'trial')
  trial(r'trial'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PremiumInfoDtoSource_Enum(this.value);

  final String value;

  @override
  String toString() => value;
}
