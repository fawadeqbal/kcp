//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_code_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingCodeDto {
  /// Returns a new [PairingCodeDto] instance.
  PairingCodeDto({required this.code});

  /// What the parent typed or scanned; spaces and dashes don't matter.
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is PairingCodeDto && other.code == code;

  @override
  int get hashCode => code.hashCode;

  factory PairingCodeDto.fromJson(Map<String, dynamic> json) =>
      _$PairingCodeDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingCodeDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
