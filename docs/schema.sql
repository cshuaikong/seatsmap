-- ============================================================
-- 座位图数据库：2 张表
-- ============================================================

CREATE TABLE venue (
    venue_id             VARCHAR(50)   PRIMARY KEY,
    name     VARCHAR(200)  NOT NULL DEFAULT '',
    type     VARCHAR(50)   NOT NULL DEFAULT 'SIMPLE',
    scale     DECIMAL(8,2)  NOT NULL DEFAULT 1.0,
    `options`  JSON        DEFAULT NULL,               -- venue.visualConfig
    -- 类别信息 (JSON)
    categories     JSON          NOT NULL,                   -- [{key, label, color, accessible, price}]
    -- 分区图形
    sections      JSON          NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seats (
    id            VARCHAR(50)  PRIMARY KEY,
    sec_id    VARCHAR(50)  NOT NULL DEFAULT '',
    row_id     VARCHAR(30)  NOT NULL DEFAULT '',
    cat_id   INT           NOT NULL DEFAULT 0,
    label         VARCHAR(20)  NOT NULL DEFAULT '',
    x         DECIMAL(8,2) NOT NULL DEFAULT 0,
    y         DECIMAL(8,2) NOT NULL DEFAULT 0,
    status        TINYINT      NOT NULL DEFAULT 0,            -- 0=available 1=sold 2=reserved

    KEY idx_seat_sec (sec_id),
    KEY idx_seat_sec_row (sec_id, row_id),
    KEY idx_seat_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

