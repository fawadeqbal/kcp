//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/role_summary_dto.dart';
import 'package:kcp_api/src/model/student_summary_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'me_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class MeDto {
  /// Returns a new [MeDto] instance.
  MeDto({
    required this.id,

    required this.kind,

    required this.email,

    required this.username,

    required this.displayName,

    required this.languageCode,

    required this.countryCode,

    required this.role,

    required this.twoFactorEnabled,

    required this.mustAcceptTerms,

    required this.student,

    required this.rules,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(
    name: r'kind',
    required: true,
    includeIfNull: false,
    unknownEnumValue: MeDtoKindEnum.unknownDefaultOpenApi,
  )
  final MeDtoKindEnum kind;

  @JsonKey(name: r'email', required: true, includeIfNull: true)
  final String? email;

  @JsonKey(name: r'username', required: true, includeIfNull: true)
  final String? username;

  @JsonKey(name: r'displayName', required: true, includeIfNull: true)
  final String? displayName;

  @JsonKey(name: r'languageCode', required: true, includeIfNull: false)
  final String languageCode;

  @JsonKey(name: r'countryCode', required: true, includeIfNull: true)
  final String? countryCode;

  @JsonKey(name: r'role', required: true, includeIfNull: false)
  final RoleSummaryDto role;

  /// Whether two-factor login is switched on (staff only).
  @JsonKey(name: r'twoFactorEnabled', required: true, includeIfNull: false)
  final bool twoFactorEnabled;

  /// Parents: the terms changed since they last accepted them (ask before going on).
  @JsonKey(name: r'mustAcceptTerms', required: true, includeIfNull: false)
  final bool mustAcceptTerms;

  /// Students only: what other children see.
  @JsonKey(name: r'student', required: true, includeIfNull: true)
  final StudentSummaryDto? student;

  /// The caller's permission rules in CASL format, so apps can hide what the API would refuse anyway. The API always re-checks.
  @JsonKey(name: r'rules', required: true, includeIfNull: false)
  final List<Object> rules;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MeDto &&
          other.id == id &&
          other.kind == kind &&
          other.email == email &&
          other.username == username &&
          other.displayName == displayName &&
          other.languageCode == languageCode &&
          other.countryCode == countryCode &&
          other.role == role &&
          other.twoFactorEnabled == twoFactorEnabled &&
          other.mustAcceptTerms == mustAcceptTerms &&
          other.student == student &&
          other.rules == rules;

  @override
  int get hashCode =>
      id.hashCode +
      kind.hashCode +
      (email == null ? 0 : email.hashCode) +
      (username == null ? 0 : username.hashCode) +
      (displayName == null ? 0 : displayName.hashCode) +
      languageCode.hashCode +
      (countryCode == null ? 0 : countryCode.hashCode) +
      role.hashCode +
      twoFactorEnabled.hashCode +
      mustAcceptTerms.hashCode +
      (student == null ? 0 : student.hashCode) +
      rules.hashCode;

  factory MeDto.fromJson(Map<String, dynamic> json) => _$MeDtoFromJson(json);

  Map<String, dynamic> toJson() => _$MeDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum MeDtoKindEnum {
  @JsonValue(r'STUDENT')
  STUDENT(r'STUDENT'),
  @JsonValue(r'ADULT')
  ADULT(r'ADULT'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const MeDtoKindEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
