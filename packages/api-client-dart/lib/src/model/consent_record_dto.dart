//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'consent_record_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ConsentRecordDto {
  /// Returns a new [ConsentRecordDto] instance.
  ConsentRecordDto({
    required this.id,

    required this.type,

    required this.policyVersion,

    required this.method,

    required this.grantedAt,

    required this.revokedAt,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(
    name: r'type',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ConsentRecordDtoTypeEnum.unknownDefaultOpenApi,
  )
  final ConsentRecordDtoTypeEnum type;

  @JsonKey(name: r'policyVersion', required: true, includeIfNull: false)
  final String policyVersion;

  @JsonKey(name: r'method', required: true, includeIfNull: false)
  final String method;

  @JsonKey(name: r'grantedAt', required: true, includeIfNull: false)
  final DateTime grantedAt;

  @JsonKey(name: r'revokedAt', required: true, includeIfNull: true)
  final DateTime? revokedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConsentRecordDto &&
          other.id == id &&
          other.type == type &&
          other.policyVersion == policyVersion &&
          other.method == method &&
          other.grantedAt == grantedAt &&
          other.revokedAt == revokedAt;

  @override
  int get hashCode =>
      id.hashCode +
      type.hashCode +
      policyVersion.hashCode +
      method.hashCode +
      grantedAt.hashCode +
      (revokedAt == null ? 0 : revokedAt.hashCode);

  factory ConsentRecordDto.fromJson(Map<String, dynamic> json) =>
      _$ConsentRecordDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ConsentRecordDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ConsentRecordDtoTypeEnum {
  @JsonValue(r'ACCOUNT')
  ACCOUNT(r'ACCOUNT'),
  @JsonValue(r'PUBLIC_LEADERBOARDS')
  PUBLIC_LEADERBOARDS(r'PUBLIC_LEADERBOARDS'),
  @JsonValue(r'PUBLIC_PORTFOLIO')
  PUBLIC_PORTFOLIO(r'PUBLIC_PORTFOLIO'),
  @JsonValue(r'HUB_WORK')
  HUB_WORK(r'HUB_WORK'),
  @JsonValue(r'EARNINGS')
  EARNINGS(r'EARNINGS'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ConsentRecordDtoTypeEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
