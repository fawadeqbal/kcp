// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'me_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$MeDtoCWProxy {
  MeDto id(String id);

  MeDto kind(MeDtoKindEnum kind);

  MeDto email(String? email);

  MeDto username(String? username);

  MeDto displayName(String? displayName);

  MeDto languageCode(String languageCode);

  MeDto countryCode(String? countryCode);

  MeDto role(RoleSummaryDto role);

  MeDto twoFactorEnabled(bool twoFactorEnabled);

  MeDto mustAcceptTerms(bool mustAcceptTerms);

  MeDto student(StudentSummaryDto? student);

  MeDto rules(List<Object> rules);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `MeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// MeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  MeDto call({
    String id,
    MeDtoKindEnum kind,
    String? email,
    String? username,
    String? displayName,
    String languageCode,
    String? countryCode,
    RoleSummaryDto role,
    bool twoFactorEnabled,
    bool mustAcceptTerms,
    StudentSummaryDto? student,
    List<Object> rules,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfMeDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfMeDto.copyWith.fieldName(...)`
class _$MeDtoCWProxyImpl implements _$MeDtoCWProxy {
  const _$MeDtoCWProxyImpl(this._value);

  final MeDto _value;

  @override
  MeDto id(String id) => this(id: id);

  @override
  MeDto kind(MeDtoKindEnum kind) => this(kind: kind);

  @override
  MeDto email(String? email) => this(email: email);

  @override
  MeDto username(String? username) => this(username: username);

  @override
  MeDto displayName(String? displayName) => this(displayName: displayName);

  @override
  MeDto languageCode(String languageCode) => this(languageCode: languageCode);

  @override
  MeDto countryCode(String? countryCode) => this(countryCode: countryCode);

  @override
  MeDto role(RoleSummaryDto role) => this(role: role);

  @override
  MeDto twoFactorEnabled(bool twoFactorEnabled) =>
      this(twoFactorEnabled: twoFactorEnabled);

  @override
  MeDto mustAcceptTerms(bool mustAcceptTerms) =>
      this(mustAcceptTerms: mustAcceptTerms);

  @override
  MeDto student(StudentSummaryDto? student) => this(student: student);

  @override
  MeDto rules(List<Object> rules) => this(rules: rules);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `MeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// MeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  MeDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? kind = const $CopyWithPlaceholder(),
    Object? email = const $CopyWithPlaceholder(),
    Object? username = const $CopyWithPlaceholder(),
    Object? displayName = const $CopyWithPlaceholder(),
    Object? languageCode = const $CopyWithPlaceholder(),
    Object? countryCode = const $CopyWithPlaceholder(),
    Object? role = const $CopyWithPlaceholder(),
    Object? twoFactorEnabled = const $CopyWithPlaceholder(),
    Object? mustAcceptTerms = const $CopyWithPlaceholder(),
    Object? student = const $CopyWithPlaceholder(),
    Object? rules = const $CopyWithPlaceholder(),
  }) {
    return MeDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      kind: kind == const $CopyWithPlaceholder()
          ? _value.kind
          // ignore: cast_nullable_to_non_nullable
          : kind as MeDtoKindEnum,
      email: email == const $CopyWithPlaceholder()
          ? _value.email
          // ignore: cast_nullable_to_non_nullable
          : email as String?,
      username: username == const $CopyWithPlaceholder()
          ? _value.username
          // ignore: cast_nullable_to_non_nullable
          : username as String?,
      displayName: displayName == const $CopyWithPlaceholder()
          ? _value.displayName
          // ignore: cast_nullable_to_non_nullable
          : displayName as String?,
      languageCode: languageCode == const $CopyWithPlaceholder()
          ? _value.languageCode
          // ignore: cast_nullable_to_non_nullable
          : languageCode as String,
      countryCode: countryCode == const $CopyWithPlaceholder()
          ? _value.countryCode
          // ignore: cast_nullable_to_non_nullable
          : countryCode as String?,
      role: role == const $CopyWithPlaceholder()
          ? _value.role
          // ignore: cast_nullable_to_non_nullable
          : role as RoleSummaryDto,
      twoFactorEnabled: twoFactorEnabled == const $CopyWithPlaceholder()
          ? _value.twoFactorEnabled
          // ignore: cast_nullable_to_non_nullable
          : twoFactorEnabled as bool,
      mustAcceptTerms: mustAcceptTerms == const $CopyWithPlaceholder()
          ? _value.mustAcceptTerms
          // ignore: cast_nullable_to_non_nullable
          : mustAcceptTerms as bool,
      student: student == const $CopyWithPlaceholder()
          ? _value.student
          // ignore: cast_nullable_to_non_nullable
          : student as StudentSummaryDto?,
      rules: rules == const $CopyWithPlaceholder()
          ? _value.rules
          // ignore: cast_nullable_to_non_nullable
          : rules as List<Object>,
    );
  }
}

extension $MeDtoCopyWith on MeDto {
  /// Returns a callable class that can be used as follows: `instanceOfMeDto.copyWith(...)` or like so:`instanceOfMeDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$MeDtoCWProxy get copyWith => _$MeDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MeDto _$MeDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('MeDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'kind',
          'email',
          'username',
          'displayName',
          'languageCode',
          'countryCode',
          'role',
          'twoFactorEnabled',
          'mustAcceptTerms',
          'student',
          'rules',
        ],
      );
      final val = MeDto(
        id: $checkedConvert('id', (v) => v as String),
        kind: $checkedConvert(
          'kind',
          (v) => $enumDecode(
            _$MeDtoKindEnumEnumMap,
            v,
            unknownValue: MeDtoKindEnum.unknownDefaultOpenApi,
          ),
        ),
        email: $checkedConvert('email', (v) => v as String?),
        username: $checkedConvert('username', (v) => v as String?),
        displayName: $checkedConvert('displayName', (v) => v as String?),
        languageCode: $checkedConvert('languageCode', (v) => v as String),
        countryCode: $checkedConvert('countryCode', (v) => v as String?),
        role: $checkedConvert(
          'role',
          (v) => RoleSummaryDto.fromJson(v as Map<String, dynamic>),
        ),
        twoFactorEnabled: $checkedConvert('twoFactorEnabled', (v) => v as bool),
        mustAcceptTerms: $checkedConvert('mustAcceptTerms', (v) => v as bool),
        student: $checkedConvert(
          'student',
          (v) => v == null
              ? null
              : StudentSummaryDto.fromJson(v as Map<String, dynamic>),
        ),
        rules: $checkedConvert(
          'rules',
          (v) => (v as List<dynamic>).map((e) => e as Object).toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$MeDtoToJson(MeDto instance) => <String, dynamic>{
  'id': instance.id,
  'kind': _$MeDtoKindEnumEnumMap[instance.kind]!,
  'email': instance.email,
  'username': instance.username,
  'displayName': instance.displayName,
  'languageCode': instance.languageCode,
  'countryCode': instance.countryCode,
  'role': instance.role.toJson(),
  'twoFactorEnabled': instance.twoFactorEnabled,
  'mustAcceptTerms': instance.mustAcceptTerms,
  'student': instance.student?.toJson(),
  'rules': instance.rules,
};

const _$MeDtoKindEnumEnumMap = {
  MeDtoKindEnum.STUDENT: 'STUDENT',
  MeDtoKindEnum.ADULT: 'ADULT',
  MeDtoKindEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
