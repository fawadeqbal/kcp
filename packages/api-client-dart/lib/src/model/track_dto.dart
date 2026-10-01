//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/module_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'track_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class TrackDto {
  /// Returns a new [TrackDto] instance.
  TrackDto({
    required this.id,

    required this.title,

    required this.ageFrom,

    required this.ageTo,

    required this.modules,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  /// Ages the track is made for (Explorer: 9–12), or null for everyone.
  @JsonKey(name: r'ageFrom', required: true, includeIfNull: true)
  final num? ageFrom;

  @JsonKey(name: r'ageTo', required: true, includeIfNull: true)
  final num? ageTo;

  @JsonKey(name: r'modules', required: true, includeIfNull: false)
  final List<ModuleDto> modules;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TrackDto &&
          other.id == id &&
          other.title == title &&
          other.ageFrom == ageFrom &&
          other.ageTo == ageTo &&
          other.modules == modules;

  @override
  int get hashCode =>
      id.hashCode +
      title.hashCode +
      (ageFrom == null ? 0 : ageFrom.hashCode) +
      (ageTo == null ? 0 : ageTo.hashCode) +
      modules.hashCode;

  factory TrackDto.fromJson(Map<String, dynamic> json) =>
      _$TrackDtoFromJson(json);

  Map<String, dynamic> toJson() => _$TrackDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
