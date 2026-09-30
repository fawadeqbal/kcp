//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'remove_device_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class RemoveDeviceDto {
  /// Returns a new [RemoveDeviceDto] instance.
  RemoveDeviceDto({required this.token});

  @JsonKey(name: r'token', required: true, includeIfNull: false)
  final String token;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RemoveDeviceDto && other.token == token;

  @override
  int get hashCode => token.hashCode;

  factory RemoveDeviceDto.fromJson(Map<String, dynamic> json) =>
      _$RemoveDeviceDtoFromJson(json);

  Map<String, dynamic> toJson() => _$RemoveDeviceDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
