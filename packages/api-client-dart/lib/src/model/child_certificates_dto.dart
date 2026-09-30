//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/certificate_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'child_certificates_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChildCertificatesDto {
  /// Returns a new [ChildCertificatesDto] instance.
  ChildCertificatesDto({required this.certificates});

  @JsonKey(name: r'certificates', required: true, includeIfNull: false)
  final List<CertificateDto> certificates;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChildCertificatesDto && other.certificates == certificates;

  @override
  int get hashCode => certificates.hashCode;

  factory ChildCertificatesDto.fromJson(Map<String, dynamic> json) =>
      _$ChildCertificatesDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChildCertificatesDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
