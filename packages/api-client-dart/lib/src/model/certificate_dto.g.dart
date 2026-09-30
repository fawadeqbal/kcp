// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'certificate_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$CertificateDtoCWProxy {
  CertificateDto id(String id);

  CertificateDto code(String code);

  CertificateDto moduleId(String moduleId);

  CertificateDto nickname(String nickname);

  CertificateDto moduleTitle(String moduleTitle);

  CertificateDto trackTitle(String trackTitle);

  CertificateDto issuedAt(DateTime issuedAt);

  CertificateDto revoked(bool revoked);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CertificateDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CertificateDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CertificateDto call({
    String id,
    String code,
    String moduleId,
    String nickname,
    String moduleTitle,
    String trackTitle,
    DateTime issuedAt,
    bool revoked,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfCertificateDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfCertificateDto.copyWith.fieldName(...)`
class _$CertificateDtoCWProxyImpl implements _$CertificateDtoCWProxy {
  const _$CertificateDtoCWProxyImpl(this._value);

  final CertificateDto _value;

  @override
  CertificateDto id(String id) => this(id: id);

  @override
  CertificateDto code(String code) => this(code: code);

  @override
  CertificateDto moduleId(String moduleId) => this(moduleId: moduleId);

  @override
  CertificateDto nickname(String nickname) => this(nickname: nickname);

  @override
  CertificateDto moduleTitle(String moduleTitle) =>
      this(moduleTitle: moduleTitle);

  @override
  CertificateDto trackTitle(String trackTitle) => this(trackTitle: trackTitle);

  @override
  CertificateDto issuedAt(DateTime issuedAt) => this(issuedAt: issuedAt);

  @override
  CertificateDto revoked(bool revoked) => this(revoked: revoked);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CertificateDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CertificateDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CertificateDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? code = const $CopyWithPlaceholder(),
    Object? moduleId = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? moduleTitle = const $CopyWithPlaceholder(),
    Object? trackTitle = const $CopyWithPlaceholder(),
    Object? issuedAt = const $CopyWithPlaceholder(),
    Object? revoked = const $CopyWithPlaceholder(),
  }) {
    return CertificateDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
      moduleId: moduleId == const $CopyWithPlaceholder()
          ? _value.moduleId
          // ignore: cast_nullable_to_non_nullable
          : moduleId as String,
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      moduleTitle: moduleTitle == const $CopyWithPlaceholder()
          ? _value.moduleTitle
          // ignore: cast_nullable_to_non_nullable
          : moduleTitle as String,
      trackTitle: trackTitle == const $CopyWithPlaceholder()
          ? _value.trackTitle
          // ignore: cast_nullable_to_non_nullable
          : trackTitle as String,
      issuedAt: issuedAt == const $CopyWithPlaceholder()
          ? _value.issuedAt
          // ignore: cast_nullable_to_non_nullable
          : issuedAt as DateTime,
      revoked: revoked == const $CopyWithPlaceholder()
          ? _value.revoked
          // ignore: cast_nullable_to_non_nullable
          : revoked as bool,
    );
  }
}

extension $CertificateDtoCopyWith on CertificateDto {
  /// Returns a callable class that can be used as follows: `instanceOfCertificateDto.copyWith(...)` or like so:`instanceOfCertificateDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$CertificateDtoCWProxy get copyWith => _$CertificateDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CertificateDto _$CertificateDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('CertificateDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'code',
          'moduleId',
          'nickname',
          'moduleTitle',
          'trackTitle',
          'issuedAt',
          'revoked',
        ],
      );
      final val = CertificateDto(
        id: $checkedConvert('id', (v) => v as String),
        code: $checkedConvert('code', (v) => v as String),
        moduleId: $checkedConvert('moduleId', (v) => v as String),
        nickname: $checkedConvert('nickname', (v) => v as String),
        moduleTitle: $checkedConvert('moduleTitle', (v) => v as String),
        trackTitle: $checkedConvert('trackTitle', (v) => v as String),
        issuedAt: $checkedConvert(
          'issuedAt',
          (v) => DateTime.parse(v as String),
        ),
        revoked: $checkedConvert('revoked', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$CertificateDtoToJson(CertificateDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'moduleId': instance.moduleId,
      'nickname': instance.nickname,
      'moduleTitle': instance.moduleTitle,
      'trackTitle': instance.trackTitle,
      'issuedAt': instance.issuedAt.toIso8601String(),
      'revoked': instance.revoked,
    };
