UPDATE
	public.qy_qlab_sample
SET
	is_available = FALSE
WHERE
	dataset_name = 'nvidia/Nemotron-Image-Training-v3'
	AND is_available IS DISTINCT FROM FALSE
	AND id IN (
		SELECT
			sample_id
		FROM
			(
				SELECT
					sample_id,
					COUNT(*) OVER (PARTITION BY dataset_name, ref) AS ref_count
				FROM
					(
						SELECT DISTINCT
							sample_id,
							dataset_name,
							ref
						FROM
							(
								SELECT
									s.id AS sample_id,
									s.dataset_name,
									s.item_0_1 ->> 'ref' AS ref
								FROM
									(
										SELECT
											s.*,
											jsonb_array_elements(
												CASE
													WHEN jsonb_typeof(s.item_0_0 -> 'content') = 'array' THEN s.item_0_0 -> 'content'
													ELSE '[]'::JSONB
												END
											) AS item_0_1
										FROM
											(
												SELECT
													s.*,
													jsonb_array_elements(
														CASE
															WHEN jsonb_typeof(
																(CASE
																	WHEN jsonb_typeof(s.content_info -> 'messages') = 'string' THEN (s.content_info ->> 'messages')::JSONB
																	ELSE s.content_info -> 'messages'
																END)
															) = 'array' THEN (
																CASE
																	WHEN jsonb_typeof(s.content_info -> 'messages') = 'string' THEN (s.content_info ->> 'messages')::JSONB
																	ELSE s.content_info -> 'messages'
																END
															)
															ELSE '[]'::JSONB
														END
													) AS item_0_0
												FROM
													(
														SELECT
															id,
															dataset_name,
															content_info,
															extra_info
														FROM
															public.qy_qlab_sample
														WHERE
															dataset_name = 'nvidia/Nemotron-Image-Training-v3'
															AND modalities @> ARRAY['image']::TEXT[]
													) s
											) s
									) s
								WHERE
									(
										s.item_0_1 ->> 'type' = 'image'
										OR s.item_0_1 ? 'image'
									)
							) raw_refs
						WHERE
							ref IS NOT NULL
					) sample_refs
			) counted_refs
		WHERE
			ref_count > 10
	);
