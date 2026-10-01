// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'review_summary_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ReviewSummaryDtoCWProxy {
  ReviewSummaryDto id(String id);

  ReviewSummaryDto status(ReviewSummaryDtoStatusEnum status);

  ReviewSummaryDto version(num version);

  ReviewSummaryDto requestedAt(DateTime requestedAt);

  ReviewSummaryDto decidedAt(DateTime? decidedAt);

  ReviewSummaryDto seen(bool seen);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReviewSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReviewSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReviewSummaryDto call({
    String id,
    ReviewSummaryDtoStatusEnum status,
    num version,
    DateTime requestedAt,
    DateTime? decidedAt,
    bool seen,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfReviewSummaryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfReviewSummaryDto.copyWith.fieldName(...)`
class _$ReviewSummaryDtoCWProxyImpl implements _$ReviewSummaryDtoCWProxy {
  const _$ReviewSummaryDtoCWProxyImpl(this._value);

  final ReviewSummaryDto _value;

  @override
  ReviewSummaryDto id(String id) => this(id: id);

  @override
  ReviewSummaryDto status(ReviewSummaryDtoStatusEnum status) =>
      this(status: status);

  @override
  ReviewSummaryDto version(num version) => this(version: version);

  @override
  ReviewSummaryDto requestedAt(DateTime requestedAt) =>
      this(requestedAt: requestedAt);

  @override
  ReviewSummaryDto decidedAt(DateTime? decidedAt) => this(decidedAt: decidedAt);

  @override
  ReviewSummaryDto seen(bool seen) => this(seen: seen);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReviewSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReviewSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReviewSummaryDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
    Object? version = const $CopyWithPlaceholder(),
    Object? requestedAt = const $CopyWithPlaceholder(),
    Object? decidedAt = const $CopyWithPlaceholder(),
    Object? seen = const $CopyWithPlaceholder(),
  }) {
    return ReviewSummaryDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as ReviewSummaryDtoStatusEnum,
      version: version == const $CopyWithPlaceholder()
          ? _value.version
          // ignore: cast_nullable_to_non_nullable
          : version as num,
      requestedAt: requestedAt == const $CopyWithPlaceholder()
          ? _value.requestedAt
          // ignore: cast_nullable_to_non_nullable
          : requestedAt as DateTime,
      decidedAt: decidedAt == const $CopyWithPlaceholder()
          ? _value.decidedAt
          // ignore: cast_nullable_to_non_nullable
          : decidedAt as DateTime?,
      seen: seen == const $CopyWithPlaceholder()
          ? _value.seen
          // ignore: cast_nullable_to_non_nullable
          : seen as bool,
    );
  }
}

extension $ReviewSummaryDtoCopyWith on ReviewSummaryDto {
  /// Returns a callable class that can be used as follows: `instanceOfReviewSummaryDto.copyWith(...)` or like so:`instanceOfReviewSummaryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ReviewSummaryDtoCWProxy get copyWith => _$ReviewSummaryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ReviewSummaryDto _$ReviewSummaryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ReviewSummaryDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'status',
          'version',
          'requestedAt',
          'decidedAt',
          'seen',
        ],
      );
      final val = ReviewSummaryDto(
        id: $checkedConvert('id', (v) => v as String),
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$ReviewSummaryDtoStatusEnumEnumMap,
            v,
            unknownValue: ReviewSummaryDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
        version: $checkedConvert('version', (v) => v as num),
        requestedAt: $checkedConvert(
          'requestedAt',
          (v) => DateTime.parse(v as String),
        ),
        decidedAt: $checkedConvert(
          'decidedAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        seen: $checkedConvert('seen', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ReviewSummaryDtoToJson(ReviewSummaryDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'status': _$ReviewSummaryDtoStatusEnumEnumMap[instance.status]!,
      'version': instance.version,
      'requestedAt': instance.requestedAt.toIso8601String(),
      'decidedAt': instance.decidedAt?.toIso8601String(),
      'seen': instance.seen,
    };

const _$ReviewSummaryDtoStatusEnumEnumMap = {
  ReviewSummaryDtoStatusEnum.WAITING: 'WAITING',
  ReviewSummaryDtoStatusEnum.IN_REVIEW: 'IN_REVIEW',
  ReviewSummaryDtoStatusEnum.APPROVED: 'APPROVED',
  ReviewSummaryDtoStatusEnum.CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  ReviewSummaryDtoStatusEnum.CANCELLED: 'CANCELLED',
  ReviewSummaryDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
