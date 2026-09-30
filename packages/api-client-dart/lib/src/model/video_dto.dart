//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'video_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class VideoDto {
  /// Returns a new [VideoDto] instance.
  VideoDto({required this.provider, required this.id});

  /// \"youtube\" or \"cloudflare\".
  @JsonKey(name: r'provider', required: true, includeIfNull: false)
  final String provider;

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is VideoDto && other.provider == provider && other.id == id;

  @override
  int get hashCode => provider.hashCode + id.hashCode;

  factory VideoDto.fromJson(Map<String, dynamic> json) =>
      _$VideoDtoFromJson(json);

  Map<String, dynamic> toJson() => _$VideoDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
