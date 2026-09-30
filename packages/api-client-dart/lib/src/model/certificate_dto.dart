//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'certificate_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class CertificateDto {
  /// Returns a new [CertificateDto] instance.
  CertificateDto({
    required this.id,

    required this.code,

    required this.moduleId,

    required this.nickname,

    required this.moduleTitle,

    required this.trackTitle,

    required this.issuedAt,

    required this.revoked,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// \"KCP-7F3K-9Q2M\"
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  @JsonKey(name: r'moduleId', required: true, includeIfNull: false)
  final String moduleId;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  /// In the requested language (English when missing).
  @JsonKey(name: r'moduleTitle', required: true, includeIfNull: false)
  final String moduleTitle;

  @JsonKey(name: r'trackTitle', required: true, includeIfNull: false)
  final String trackTitle;

  @JsonKey(name: r'issuedAt', required: true, includeIfNull: false)
  final DateTime issuedAt;

  @JsonKey(name: r'revoked', required: true, includeIfNull: false)
  final bool revoked;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificateDto &&
          other.id == id &&
          other.code == code &&
          other.moduleId == moduleId &&
          other.nickname == nickname &&
          other.moduleTitle == moduleTitle &&
          other.trackTitle == trackTitle &&
          other.issuedAt == issuedAt &&
          other.revoked == revoked;

  @override
  int get hashCode =>
      id.hashCode +
      code.hashCode +
      moduleId.hashCode +
      nickname.hashCode +
      moduleTitle.hashCode +
      trackTitle.hashCode +
      issuedAt.hashCode +
      revoked.hashCode;

  factory CertificateDto.fromJson(Map<String, dynamic> json) =>
      _$CertificateDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CertificateDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
